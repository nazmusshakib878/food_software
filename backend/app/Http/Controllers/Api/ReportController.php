<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PosOrder;
use App\Models\PosOrderItem;
use App\Models\PosPaymentTransaction;
use App\Models\PosShift;
use App\Models\PosInventoryMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReportController extends Controller
{
    private function authorizeReports($user): ?JsonResponse
    {
        $hasManagementRole = in_array($user->role, ['admin', 'manager'], true);
        if ($user->role === 'staff' || (!$hasManagementRole && !in_array('reports', $user->permissions ?? [], true))) {
            return response()->json(['success' => false, 'error' => 'ACCESS DENIED: Insufficient permissions for management reports'], 403);
        }
        return null;
    }

    private function reportWindow(Request $request, $user): array
    {
        $data = $request->validate([
            'period' => ['sometimes', 'in:day,week,month'],
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d'],
        ]);
        if (isset($data['from']) !== isset($data['to'])) {
            throw ValidationException::withMessages(['date' => 'Both from and to dates are required.']);
        }
        $businessTimezone = $user->branch()->value('timezone') ?: config('app.timezone');
        $databaseTimezone = config('app.timezone');
        if (isset($data['from'])) {
            $from = Carbon::createFromFormat('!Y-m-d', $data['from'], $businessTimezone)->startOfDay()->setTimezone($databaseTimezone);
            $to = Carbon::createFromFormat('!Y-m-d', $data['to'], $businessTimezone)->endOfDay()->setTimezone($databaseTimezone);
            if ($from->greaterThan($to)) throw ValidationException::withMessages(['date' => 'Date range is invalid.']);
            return [$from, $to, 'custom'];
        }
        $date = isset($data['date'])
            ? Carbon::createFromFormat('!Y-m-d', $data['date'], $businessTimezone)->startOfDay()
            : now($businessTimezone)->startOfDay();
        $period = $data['period'] ?? 'day';
        [$from, $to] = match ($period) {
            'week' => [$date->copy()->startOfWeek(), $date->copy()->endOfWeek()],
            'month' => [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()],
            default => [$date->copy()->startOfDay(), $date->copy()->endOfDay()],
        };
        return [$from->setTimezone($databaseTimezone), $to->setTimezone($databaseTimezone), $period];
    }

    private function scopedOrders($user, Carbon $from, Carbon $to)
    {
        return PosOrder::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->where('status', '!=', 'cancelled')
            ->whereBetween('created_at', [$from, $to]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($denied = $this->authorizeReports($user)) return $denied;
        [$from, $to, $period] = $this->reportWindow($request, $user);
        $orders = $this->scopedOrders($user, $from, $to);
        $summary = (clone $orders)->selectRaw('COUNT(*) as order_count, COALESCE(SUM(grand_total),0) as gross_sales, COALESCE(SUM(tax),0) as tax_total, COALESCE(SUM(discount),0) as discount_total')->first();
        $paymentSummary = [];
        (clone $orders)->get(['method', 'payment_breakdown', 'grand_total'])->each(function (PosOrder $order) use (&$paymentSummary) {
            $parts = is_array($order->payment_breakdown) && count($order->payment_breakdown)
                ? $order->payment_breakdown
                : [$order->method => (float)$order->grand_total];
            foreach ($parts as $method => $amount) {
                if (!isset($paymentSummary[$method])) $paymentSummary[$method] = ['method' => (string)$method, 'order_count' => 0, 'amount' => 0.0];
                $paymentSummary[$method]['order_count']++;
                $paymentSummary[$method]['amount'] += (float)$amount;
            }
        });
        ksort($paymentSummary);
        $paymentSummary = array_values($paymentSummary);
        $productSummary = PosOrderItem::query()
            ->join('pos_orders', 'pos_orders.id', '=', 'pos_order_items.order_id')
            ->where('pos_orders.company_id', $user->company_id)
            ->where('pos_orders.branch_id', $user->branch_id)
            ->where('pos_orders.status', '!=', 'cancelled')
            ->whereBetween('pos_orders.created_at', [$from, $to])
            ->selectRaw('pos_order_items.item_id, pos_order_items.en_name, pos_order_items.ar_name, SUM(pos_order_items.qty) as quantity, SUM(pos_order_items.price * pos_order_items.qty) as gross_sales')
            ->groupBy('pos_order_items.item_id', 'pos_order_items.en_name', 'pos_order_items.ar_name')
            ->orderByDesc('quantity')->limit(100)->get();
        $catalog = DB::table('pos_products')
            ->leftJoin('pos_categories', function ($join) {
                $join->on('pos_categories.category_id', '=', 'pos_products.category_id')
                    ->on('pos_categories.company_id', '=', 'pos_products.company_id')
                    ->on('pos_categories.branch_id', '=', 'pos_products.branch_id');
            })
            ->where('pos_products.company_id', $user->company_id)
            ->where('pos_products.branch_id', $user->branch_id)
            ->get([
                'pos_products.product_id', 'pos_products.category_id', 'pos_products.price',
                'pos_categories.name_en as category_name_en', 'pos_categories.name_ar as category_name_ar',
            ]);

        // Keep operational reports tied to persisted records. In particular,
        // never infer refunds, application commissions, or damage from orders.
        $payments = PosPaymentTransaction::query()
            ->where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')->limit(5000)->get();
        $shifts = PosShift::query()
            ->where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->whereBetween('opened_at', [$from, $to])
            ->orderByDesc('opened_at')->limit(1000)->get();
        $damagedMovements = PosInventoryMovement::query()
            ->leftJoin('pos_products', function ($join) {
                $join->on('pos_products.product_id', '=', 'pos_inventory_movements.product_id')
                    ->on('pos_products.company_id', '=', 'pos_inventory_movements.company_id')
                    ->on('pos_products.branch_id', '=', 'pos_inventory_movements.branch_id');
            })
            ->where('pos_inventory_movements.company_id', $user->company_id)
            ->where('pos_inventory_movements.branch_id', $user->branch_id)
            ->where('pos_inventory_movements.reason', 'damage')
            ->whereBetween('pos_inventory_movements.created_at', [$from, $to])
            ->orderByDesc('pos_inventory_movements.created_at')
            ->limit(5000)
            ->get([
                'pos_inventory_movements.id', 'pos_inventory_movements.product_id',
                'pos_products.name_en', 'pos_products.name_ar',
                'pos_inventory_movements.user_id', 'pos_inventory_movements.order_id',
                'pos_inventory_movements.quantity_delta', 'pos_inventory_movements.reason',
                'pos_inventory_movements.note', 'pos_inventory_movements.created_at',
            ]);

        return response()->json([
            'success' => true,
            'companyId' => $user->company_id,
            'branchId' => $user->branch_id,
            'period' => $period,
            'from' => $from->toIso8601String(),
            'to' => $to->toIso8601String(),
            'summary' => [
                'totalOrders' => (int)$summary->order_count,
                'totalSales' => (float)$summary->gross_sales,
                'totalTax' => (float)$summary->tax_total,
                'totalDiscounts' => (float)$summary->discount_total,
            ],
            'payments' => $paymentSummary,
            'paymentTransactions' => $payments,
            'shifts' => $shifts,
            'damagedMovements' => $damagedMovements,
            'business' => [
                'company' => $user->company()->first(['name', 'legal_name', 'tax_number']),
                'branch' => $user->branch()->first(['name', 'timezone']),
            ],
            'products' => $productSummary,
            'catalog' => $catalog,
            'orders' => (clone $orders)->with('items')->latest()->limit(1000)->get(),
        ]);
    }

    public function invoices(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($denied = $this->authorizeReports($user)) return $denied;
        [$from, $to, $period] = $this->reportWindow($request, $user);
        $filters = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'search' => ['sometimes', 'string', 'max:100'],
            'user_id' => ['sometimes', 'string', 'max:64'],
            'order_type' => ['sometimes', 'string', 'max:64'],
            'payment_method' => ['sometimes', 'string', 'max:64'],
            'sort' => ['sometimes', 'in:created_at,grand_total,id'],
            'direction' => ['sometimes', 'in:asc,desc'],
        ]);
        $query = $this->scopedOrders($user, $from, $to);
        if (!empty($filters['user_id'])) $query->where('user_id', $filters['user_id']);
        if (!empty($filters['order_type'])) $query->where('order_type_id', $filters['order_type']);
        if (!empty($filters['payment_method'])) $query->where('method', $filters['payment_method']);
        if (!empty($filters['search'])) {
            $term = trim($filters['search']);
            $query->where(function ($builder) use ($term) {
                $builder->where('id', 'like', "%{$term}%")
                    ->orWhere('client_order_id', 'like', "%{$term}%")
                    ->orWhere('order_number', 'like', "%{$term}%")
                    ->orWhere('customer_name', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%");
            });
        }
        $aggregate = (clone $query)->selectRaw('COUNT(*) as invoice_count, COALESCE(SUM(grand_total),0) as total_sales, COALESCE(SUM(discount),0) as total_discount, COALESCE(SUM(tax),0) as total_tax')->first();
        $pageSize = $filters['per_page'] ?? 50;
        $direction = $filters['direction'] ?? 'desc';
        $sort = $filters['sort'] ?? 'created_at';
        $page = $query->with(['items', 'user'])->orderBy($sort, $direction)->orderBy('id', $direction)->paginate($pageSize);

        return response()->json([
            'success' => true,
            'period' => $period,
            'from' => $from->toIso8601String(),
            'to' => $to->toIso8601String(),
            'companyId' => $user->company_id,
            'branchId' => $user->branch_id,
            'summary' => [
                'invoiceCount' => (int) $aggregate->invoice_count,
                'totalSales' => (float) $aggregate->total_sales,
                'totalDiscount' => (float) $aggregate->total_discount,
                'totalTax' => (float) $aggregate->total_tax,
                'totalReturns' => null,
                'totalFutureReturns' => null,
            ],
            'invoices' => $page->items(),
            'pagination' => [
                'currentPage' => $page->currentPage(),
                'perPage' => $page->perPage(),
                'lastPage' => $page->lastPage(),
                'total' => $page->total(),
            ],
            'business' => [
                'company' => $user->company()->first(['name', 'legal_name', 'tax_number']),
                'branch' => $user->branch()->first(['name', 'timezone']),
            ],
        ]);
    }
}
