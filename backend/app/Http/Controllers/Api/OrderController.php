<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PosInventoryMovement;
use App\Models\PosOrder;
use App\Models\PosOrderCounter;
use App\Models\PosOrderItem;
use App\Models\PosPaymentTransaction;
use App\Models\PosProduct;
use App\Models\PosShift;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    private const PARTNERS = ['hungerstation', 'jahiz', 'ninja', 'keeta', 'mrsool', 'toyou', 'thechefz', 'management', 'mosque'];
    private const ORDER_TYPES = ['delivery', 'local', 'receive', 'cars', 'delivery_d'];
    private const METHODS = ['Cash', 'Ajel', 'Bank 236', 'Bank 237', 'Bank 238', 'Bank 239', 'Split', 'Staff Expense'];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = PosOrder::with(['items', 'user'])
            ->where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id);

        if ($request->filled('status')) $query->where('status', $request->query('status'));
        if ($request->filled('from')) $query->whereDate('created_at', '>=', $request->query('from'));
        if ($request->filled('to')) $query->whereDate('created_at', '<=', $request->query('to'));

        if ($request->filled('creator')) {
            $creator = strtolower((string) $request->query('creator'));
            if ($creator === 'cashier') {
                $query->where(function ($q) {
                    $q->where('order_number', 'LIKE', 'A.%')
                      ->orWhere('order_number', 'LIKE', 'a.%')
                      ->orWhere('client_order_id', 'LIKE', 'A.%')
                      ->orWhere('client_order_id', 'LIKE', 'a.%')
                      ->orWhere('id', 'LIKE', 'A.%')
                      ->orWhere('id', 'LIKE', 'a.%')
                      ->orWhere('raw_payload', 'LIKE', '%"A.%')
                      ->orWhere('raw_payload', 'LIKE', '%"a.%')
                      ->orWhereHas('user', function ($uq) {
                          $uq->whereIn('role', ['cashier', 'admin']);
                      });
                });
            } elseif ($creator === 'staff') {
                $query->where(function ($q) {
                    $q->where('order_number', 'LIKE', 'B.%')
                      ->orWhere('order_number', 'LIKE', 'b.%')
                      ->orWhere('order_number', 'LIKE', 'C.%')
                      ->orWhere('order_number', 'LIKE', 'c.%')
                      ->orWhere('order_number', 'LIKE', 'D.%')
                      ->orWhere('order_number', 'LIKE', 'd.%')
                      ->orWhere('client_order_id', 'LIKE', 'B.%')
                      ->orWhere('client_order_id', 'LIKE', 'b.%')
                      ->orWhere('client_order_id', 'LIKE', 'C.%')
                      ->orWhere('client_order_id', 'LIKE', 'c.%')
                      ->orWhere('client_order_id', 'LIKE', 'D.%')
                      ->orWhere('client_order_id', 'LIKE', 'd.%')
                      ->orWhere('id', 'LIKE', 'B.%')
                      ->orWhere('id', 'LIKE', 'b.%')
                      ->orWhere('id', 'LIKE', 'C.%')
                      ->orWhere('id', 'LIKE', 'c.%')
                      ->orWhere('id', 'LIKE', 'D.%')
                      ->orWhere('id', 'LIKE', 'd.%')
                      ->orWhere('raw_payload', 'LIKE', '%"B.%')
                      ->orWhere('raw_payload', 'LIKE', '%"b.%')
                      ->orWhere('raw_payload', 'LIKE', '%"C.%')
                      ->orWhere('raw_payload', 'LIKE', '%"c.%')
                      ->orWhere('raw_payload', 'LIKE', '%"D.%')
                      ->orWhere('raw_payload', 'LIKE', '%"d.%')
                      ->orWhereHas('user', function ($uq) {
                          $uq->where('role', 'staff');
                      });
                });
            }
        }

        return response()->json(['success' => true, 'orders' => $query->latest()->limit(100)->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $rawCustomerId = strtolower((string)$request->input('customerId', 'cash'));
        if ($user->role === 'staff' && $rawCustomerId !== 'cash') {
            return response()->json(['success' => false, 'error' => 'Staff may only submit cash customer orders.'], 403);
        }
        $data = $request->validate([
            'orderId' => ['required', 'string', 'max:100'],
            'orderNumber' => ['nullable', 'string', 'max:100'],
            'customerId' => ['required', 'string', 'max:80'],
            'orderTypeId' => ['required', 'string', 'max:40', 'in:delivery,local,receive,cars,delivery_d'],
            'customer' => ['nullable', 'string', 'max:160'],
            'orderType' => ['nullable', 'string', 'max:100'],
            'deliveryDisplay' => ['nullable', 'string', 'max:100'],
            'table' => ['nullable', 'string', 'max:80'],
            'shiftId' => ['nullable', 'string', 'max:80'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'phone' => ['nullable', 'string', 'max:40'],
            'discountType' => ['nullable', 'in:none,fixed,percent'],
            'discountValue' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'paid' => ['required', 'numeric', 'min:0', 'max:999999999'],
            'method' => ['required', 'string', 'in:Cash,Ajel,Bank 236,Bank 237,Bank 238,Bank 239,Split,Staff Expense'],
            'paymentBreakdown' => ['nullable', 'array'],
            'paymentBreakdown.*' => ['numeric', 'min:0', 'max:999999999'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.id' => ['required', 'string', 'max:100'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:500'],
            'items.*.note' => ['nullable', 'string', 'max:1000'],
            'items.*.addons' => ['nullable', 'array'],
            'items.*.modifiers' => ['nullable', 'array'],
        ]);

        $customerId = strtolower($data['customerId']);
        if (!in_array($customerId, array_merge(['cash'], self::PARTNERS), true)) {
            throw ValidationException::withMessages(['customerId' => ['Unsupported customer type.']]);
        }
        $onlinePartner = in_array($customerId, ['hungerstation', 'jahiz', 'ninja', 'keeta', 'mrsool', 'toyou', 'thechefz'], true);
        if ($onlinePartner && ($data['orderTypeId'] !== 'delivery' || $data['method'] !== 'Ajel')) {
            throw ValidationException::withMessages(['method' => ['Delivery partners require the configured Ajel method and delivery order type.']]);
        }
        if ($customerId === 'management' && $data['method'] !== 'Staff Expense') {
            throw ValidationException::withMessages(['method' => ['Management orders must use Staff Expense.']]);
        }
        if ($data['method'] === 'Staff Expense' && $customerId !== 'management') {
            throw ValidationException::withMessages(['customerId' => ['Staff Expense is only valid for management orders.']]);
        }
        if ($data['method'] === 'Split' && $customerId !== 'cash') {
            throw ValidationException::withMessages(['method' => ['Split tender is only available for cash customer orders.']]);
        }
        foreach ($data['items'] as $index => $line) {
            if (!empty($line['addons']) || !empty($line['modifiers'])) {
                throw ValidationException::withMessages(["items.$index.modifiers" => ['Priced modifiers are not configured in the server catalog.']]);
            }
        }
        $paymentMethodMap = ['cash' => 'Cash', 'credit' => 'Ajel', 'bank236' => 'Bank 236', 'bank237' => 'Bank 237', 'bank238' => 'Bank 238', 'bank239' => 'Bank 239'];
        if (!empty($data['paymentBreakdown']) && array_diff(array_keys($data['paymentBreakdown']), array_keys($paymentMethodMap))) {
            throw ValidationException::withMessages(['paymentBreakdown' => ['One or more payment methods are unsupported.']]);
        }

        $tenantOrders = PosOrder::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->where('client_order_id', $data['orderId']);
        if ($user->role === 'staff') $tenantOrders->where('user_id', (string) $user->id);
        $tenantOrder = (clone $tenantOrders)->with(['items', 'user'])->first();
        if ($tenantOrder) return response()->json(['success' => true, 'duplicate' => true, 'order' => $tenantOrder], 200);
        if ($user->role === 'staff' && PosOrder::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->where('client_order_id', $data['orderId'])
            ->exists()) {
            return response()->json(['success' => false, 'error' => 'This order reference has already been used.'], 409);
        }

        $shiftId = $data['shiftId'] ?? null;
        if ($user->role === 'staff' && !$shiftId) {
            throw ValidationException::withMessages(['shiftId' => ['An active Staff shift is required before recording sales.']]);
        }
        $shiftQuery = PosShift::where('company_id', $user->company_id)->where('branch_id', $user->branch_id)->whereKey($shiftId)->where('status', 'active');
        if ($user->role === 'staff' || ($user->role !== 'admin' && !in_array('shift_manage', $user->permissions ?? [], true))) $shiftQuery->where('user_id', (string)$user->id);
        if ($shiftId && !$shiftQuery->exists()) {
            throw ValidationException::withMessages(['shiftId' => ['Shift is not active in this branch.']]);
        }

        $customerName = $data['customer'] ?? null;
        $discountType = $data['discountType'] ?? 'none';
        $discountValue = (float)($data['discountValue'] ?? 0);
        $paymentBreakdown = $data['paymentBreakdown'] ?? [];
        $paidCents = (int)round(((float)$data['paid']) * 100);

        $order = DB::transaction(function () use ($data, $user, $customerId, $customerName, $shiftId, $discountType, $discountValue, $paymentBreakdown, $paidCents, $paymentMethodMap) {
            if ($shiftId) {
                $lockedShift = PosShift::where('company_id', $user->company_id)
                    ->where('branch_id', $user->branch_id)
                    ->whereKey($shiftId)
                    ->lockForUpdate()
                    ->first();
                $ownsShift = $lockedShift && (string) $lockedShift->user_id === (string) $user->id;
                $mayManageShift = $user->role === 'admin' || ($user->role === 'cashier' && in_array('shift_manage', $user->permissions ?? [], true));
                if (!$lockedShift || $lockedShift->status !== 'active' || (!$ownsShift && !$mayManageShift)) {
                    throw ValidationException::withMessages(['shiftId' => ['Shift is not active or accessible.']]);
                }
            }

            $productIds = array_values(array_unique(array_column($data['items'], 'id')));
            $products = PosProduct::where('company_id', $user->company_id)
                ->where('branch_id', $user->branch_id)
                ->whereIn('product_id', $productIds)
                ->lockForUpdate()->get()->keyBy('product_id');

            if ($products->count() !== count($productIds)) {
                throw ValidationException::withMessages(['items' => ['One or more products are not in this branch catalog.']]);
            }

            $lines = [];
            $subtotalCents = 0;
            $requestedQtyByProduct = [];
            foreach ($data['items'] as $line) {
                $product = $products->get($line['id']);
                if (!$product->available) {
                    throw ValidationException::withMessages(['items' => ["{$product->name_en} is unavailable."]]);
                }
                $qty = (int)$line['qty'];
                $unitCents = (int)round(((float)$product->price) * 100);
                $lineCents = $unitCents * $qty;
                $subtotalCents += $lineCents;
                $requestedQtyByProduct[$product->product_id] = ($requestedQtyByProduct[$product->product_id] ?? 0) + $qty;
                $lines[] = ['product' => $product, 'qty' => $qty, 'unitCents' => $unitCents, 'grossCents' => $lineCents, 'note' => $line['note'] ?? null];
            }

            $discountCents = match ($discountType) {
                'fixed' => min($subtotalCents, (int)round($discountValue * 100)),
                'percent' => (int)round($subtotalCents * min(100, $discountValue) / 100),
                default => 0,
            };
            $grandTotalCents = $subtotalCents - $discountCents;
            $allocations = $this->allocateDiscount($lines, $discountCents, $subtotalCents);
            $taxCents = 0;
            foreach ($lines as $index => &$line) {
                $line['discountCents'] = $allocations[$index];
                $line['netGrossCents'] = $line['grossCents'] - $line['discountCents'];
                $rate = (float)$line['product']->tax_rate;
                $taxCents += $rate > 0 ? (int)round($line['netGrossCents'] * $rate / (100 + $rate)) : 0;
            }
            unset($line);

            $breakdownCents = 0;
            foreach ($paymentBreakdown as $amount) $breakdownCents += (int)round(((float)$amount) * 100);
            $tenderedCents = $paymentBreakdown ? $breakdownCents : $paidCents;
            if ($tenderedCents < $grandTotalCents) {
                throw ValidationException::withMessages(['paid' => ['Recorded tender is less than the server-calculated order total.']]);
            }
            if ($paymentBreakdown && abs($paidCents - $breakdownCents) > 1) {
                throw ValidationException::withMessages(['paymentBreakdown' => ['Tender allocations do not match the recorded paid amount.']]);
            }

            foreach ($requestedQtyByProduct as $productId => $qty) {
                $product = $products->get($productId);
                if ($product->track_stock && (float)$product->stock_on_hand < $qty) {
                    throw ValidationException::withMessages(['items' => ["Insufficient stock for {$product->name_en}."]]);
                }
            }

            $clientId = $data['orderId'];
            $orderId = 'ORD-'.Str::upper(Str::random(16));
            $seq = (int)(PosOrder::where('company_id', $user->company_id)->where('branch_id', $user->branch_id)->max('seq') ?? 1000) + 1;

            $assignedOrderNumber = PosOrderCounter::generateNextOrderNumber(
                $user->company_id,
                $user->branch_id,
                $user
            );

            $order = PosOrder::create([
                'id' => $orderId,
                'order_number' => $assignedOrderNumber,
                'client_order_id' => $clientId,
                'seq' => $seq,
                'shift_id' => $shiftId,
                'user_id' => (string)$user->id,
                'staff_id' => $user->staff_id,
                'company_id' => $user->company_id,
                'branch_id' => $user->branch_id,
                'customer_id' => $customerId,
                'customer_name' => $customerName,
                'order_type_id' => $data['orderTypeId'],
                'order_type_name' => $data['orderType'] ?? null,
                'delivery_display' => $data['deliveryDisplay'] ?? null,
                'table' => $data['table'] ?? '-',
                'status' => 'new',
                'payment_status' => 'recorded_manual',
                'subtotal' => $subtotalCents / 100,
                'tax' => $taxCents / 100,
                'tax_rate' => 15,
                'discount' => $discountCents / 100,
                'grand_total' => $grandTotalCents / 100,
                'paid' => $tenderedCents / 100,
                'change' => max(0, $tenderedCents - $grandTotalCents) / 100,
                'method' => $data['method'],
                'payment_breakdown' => $paymentBreakdown,
                'notes' => $data['notes'] ?? null,
                'phone' => $data['phone'] ?? null,
                'raw_payload' => ['order_number' => $assignedOrderNumber],
            ]);

            $transactionParts = [];
            if ($paymentBreakdown) {
                foreach ($paymentBreakdown as $key => $amount) {
                    if ((int)round(((float)$amount) * 100) > 0) $transactionParts[] = [$paymentMethodMap[$key], (int)round(((float)$amount) * 100)];
                }
            } else {
                $transactionParts[] = [$data['method'], $tenderedCents];
            }
            foreach ($transactionParts as [$method, $amountCents]) {
                PosPaymentTransaction::create([
                    'id' => (string)Str::uuid(), 'order_id' => $order->id,
                    'company_id' => $user->company_id, 'branch_id' => $user->branch_id,
                    'method' => $method, 'amount' => $amountCents / 100,
                    'status' => 'recorded_manual', 'recorded_by' => (string)$user->id,
                ]);
            }

            foreach ($lines as $line) {
                $product = $line['product'];
                PosOrderItem::create([
                    'order_id' => $order->id,
                    'item_id' => $product->product_id,
                    'en_name' => $product->name_en,
                    'ar_name' => $product->name_ar,
                    'price' => $line['unitCents'] / 100,
                    'qty' => $line['qty'],
                    'addons' => [],
                    'modifiers' => [],
                    'note' => $line['note'],
                ]);
            }

            foreach ($requestedQtyByProduct as $productId => $qty) {
                $product = $products->get($productId);
                if (!$product->track_stock) continue;
                $product->stock_on_hand = (float)$product->stock_on_hand - $qty;
                $product->save();
                PosInventoryMovement::create([
                    'company_id' => $user->company_id, 'branch_id' => $user->branch_id,
                    'product_id' => $productId, 'user_id' => (string)$user->id,
                    'order_id' => $order->id, 'quantity_delta' => -$qty,
                    'quantity_after' => $product->stock_on_hand, 'reason' => 'sale',
                ]);
            }

            return $order->load(['items', 'user']);
        }, 3);

        return response()->json(['success' => true, 'order' => $order], 201);
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'admin' && !in_array('orders_cancel', $user->permissions ?? [], true)) {
            return response()->json(['success' => false, 'error' => 'Order cancellation permission required.'], 403);
        }
        $data = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:500']]);

        $order = DB::transaction(function () use ($user, $id, $data) {
            $order = PosOrder::where('company_id', $user->company_id)
                ->where('branch_id', $user->branch_id)->whereKey($id)->lockForUpdate()->firstOrFail();
            if ($order->status === 'cancelled') return $order->load('items');
            $order->update(['status' => 'cancelled', 'cancelled_at' => now(), 'cancellation_reason' => $data['reason']]);
            $movements = PosInventoryMovement::where('company_id', $user->company_id)
                ->where('branch_id', $user->branch_id)->where('order_id', $order->id)
                ->where('reason', 'sale')->get();
            foreach ($movements as $movement) {
                $product = PosProduct::where('company_id', $user->company_id)->where('branch_id', $user->branch_id)
                    ->where('product_id', $movement->product_id)->lockForUpdate()->first();
                if (!$product || !$product->track_stock) continue;
                $quantity = abs((float)$movement->quantity_delta);
                $product->stock_on_hand = (float)$product->stock_on_hand + $quantity;
                $product->save();
                PosInventoryMovement::create([
                    'company_id' => $user->company_id, 'branch_id' => $user->branch_id,
                    'product_id' => $product->product_id, 'user_id' => (string)$user->id,
                    'order_id' => $order->id, 'quantity_delta' => $quantity,
                    'quantity_after' => $product->stock_on_hand, 'reason' => 'cancellation',
                    'note' => $data['reason'],
                ]);
            }
            return $order->load(['items', 'user']);
        }, 3);

        return response()->json(['success' => true, 'order' => $order]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['cashier', 'admin'], true) && !in_array('orders_manage', $user->permissions ?? [], true)) {
            return response()->json(['success' => false, 'error' => 'Order management permission required.'], 403);
        }
        $data = $request->validate(['status' => ['required', 'in:new,preparing,ready,served']]);
        $order = DB::transaction(function () use ($user, $id, $data) {
            $order = PosOrder::where('company_id', $user->company_id)->where('branch_id', $user->branch_id)
                ->whereKey($id)->lockForUpdate()->firstOrFail();
            if ($order->status === 'cancelled') {
                throw ValidationException::withMessages(['status' => ['Cancelled orders cannot change status.']]);
            }
            $order->update(['status' => $data['status']]);
            return $order->load(['items', 'user']);
        }, 3);
        return response()->json(['success' => true, 'order' => $order]);
    }

    private function allocateDiscount(array $lines, int $discountCents, int $subtotalCents): array
    {
        $allocations = [];
        $allocated = 0;
        foreach ($lines as $line) {
            $part = $subtotalCents > 0 ? (int)round($discountCents * $line['grossCents'] / $subtotalCents) : 0;
            $allocations[] = $part;
            $allocated += $part;
        }
        $allocations[count($allocations) - 1] += $discountCents - $allocated;
        return $allocations;
    }
}
