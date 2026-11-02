<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PosOrder;
use App\Models\PosOrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $hasManagementRole = in_array($user->role, ['admin', 'manager'], true);
        if ($user->role === 'staff' || (!$hasManagementRole && !in_array('reports', $user->permissions ?? [], true))) {
            return response()->json(['success' => false, 'error' => 'ACCESS DENIED: Insufficient permissions for management reports'], 403);
        }

        $data = $request->validate([
            'period' => ['sometimes', 'in:day,week,month'],
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d'],
        ]);
        if (isset($data['from']) !== isset($data['to'])) {
            return response()->json(['success' => false, 'error' => 'Both from and to dates are required.'], 422);
        }
        if (isset($data['from'])) {
            $from = Carbon::createFromFormat('Y-m-d', $data['from'])->startOfDay();
            $to = Carbon::createFromFormat('Y-m-d', $data['to'])->endOfDay();
            if ($from->greaterThan($to)) return response()->json(['success' => false, 'error' => 'Date range is invalid.'], 422);
            $period = 'custom';
        } else {
            $date = isset($data['date']) ? Carbon::createFromFormat('Y-m-d', $data['date'])->startOfDay() : now()->startOfDay();
            $period = $data['period'] ?? 'day';
            [$from, $to] = match ($period) {
                'week' => [$date->copy()->startOfWeek(), $date->copy()->endOfWeek()],
                'month' => [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()],
                default => [$date->copy()->startOfDay(), $date->copy()->endOfDay()],
            };
        }

        $orders = PosOrder::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->where('status', '!=', 'cancelled')
            ->whereBetween('created_at', [$from, $to]);
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
            'products' => $productSummary,
            'orders' => (clone $orders)->with('items')->latest()->limit(1000)->get(),
        ]);
    }
}
