<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PosOrder;
use App\Models\PosOrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    protected array $authorizedPartners = [
        'hungerstation', 'jahiz', 'ninja', 'keeta', 'mrsool', 'toyou', 'thechefz', 'management', 'mosque'
    ];

    protected array $standardOrderTypes = [
        'delivery', 'local', 'receive', 'cars', 'delivery_d'
    ];

    /**
     * List recent POS Orders.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $orders = PosOrder::with('items')
            ->where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->latest()
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'orders' => $orders,
        ]);
    }

    /**
     * Submit and validate a new POS Order with strict Role-Based Access Control.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized: Session required',
            ], 401);
        }

        $customerId = strtolower($request->input('customerId', 'cash'));
        $orderTypeId = strtolower($request->input('orderTypeId', 'delivery'));

        // 1. Validate Standard Order Type
        if (!in_array($orderTypeId, $this->standardOrderTypes)) {
            return response()->json([
                'success' => false,
                'error' => "Invalid order type '{$orderTypeId}'. Must be one of: " . implode(', ', $this->standardOrderTypes),
            ], 400);
        }

        // 2. Strict Role-Based Validation for Staff
        if ($user->role === 'staff') {
            if ($customerId !== 'cash' || in_array($customerId, $this->authorizedPartners)) {
                return response()->json([
                    'success' => false,
                    'error' => 'ACCESS DENIED: Staff role cannot submit Delivery Partner orders. Cash Customer only.',
                ], 403);
            }
        }

        // 3. Validate Cashier permitted customer IDs
        $allowedCustomerIds = array_merge(['cash'], $this->authorizedPartners);
        if (!in_array($customerId, $allowedCustomerIds)) {
            return response()->json([
                'success' => false,
                'error' => "Invalid customer type '{$customerId}'.",
            ], 400);
        }

        // 4. Save Order and Items to Database
        $order = DB::transaction(function () use ($request, $user, $customerId, $orderTypeId) {
            $orderId = $request->input('orderId') ?? $request->input('id') ?? ('ORD-' . hrtime(true));
            $seq = $request->input('seq') ?? (PosOrder::max('seq') ? PosOrder::max('seq') + 1 : 1001);
            $grandTotal = $request->input('total') ?? $request->input('grandTotal') ?? 0;
            $subtotal = $request->input('subtotal') ?? $grandTotal;
            $tax = $request->input('tax') ?? round($grandTotal * 0.15, 2);

            $orderRecord = PosOrder::create([
                'id' => $orderId,
                'seq' => $seq,
                'shift_id' => $request->input('shiftId', 'SH-101'),
                'user_id' => (string)$user->id,
                'staff_id' => $user->staff_id,
                'company_id' => $user->company_id,
                'branch_id' => $user->branch_id,
                'customer_id' => $customerId,
                'customer_name' => $request->input('customer'),
                'order_type_id' => $orderTypeId,
                'order_type_name' => $request->input('orderType'),
                'delivery_display' => $request->input('deliveryDisplay'),
                'table' => $request->input('table', '-'),
                'status' => 'completed',
                'subtotal' => $subtotal,
                'tax' => $tax,
                'tax_rate' => $request->input('taxRate', 15),
                'discount' => $request->input('discount', 0),
                'grand_total' => $grandTotal,
                'paid' => $request->input('paid', $grandTotal),
                'change' => $request->input('change', 0),
                'method' => $request->input('method', 'Cash'),
                'notes' => $request->input('notes'),
                'phone' => $request->input('phone'),
                'raw_payload' => $request->all(),
            ]);

            $items = $request->input('items', []);
            if (is_array($items)) {
                foreach ($items as $item) {
                    PosOrderItem::create([
                        'order_id' => $orderRecord->id,
                        'item_id' => $item['id'] ?? 'item_0',
                        'en_name' => $item['enName'] ?? 'Item',
                        'ar_name' => $item['arName'] ?? null,
                        'price' => $item['price'] ?? 0,
                        'qty' => $item['qty'] ?? 1,
                        'addons' => $item['addons'] ?? null,
                        'modifiers' => $item['modifiers'] ?? null,
                        'note' => $item['note'] ?? null,
                    ]);
                }
            }

            return $orderRecord;
        });

        return response()->json([
            'success' => true,
            'message' => 'Order validated and authorized successfully',
            'orderId' => $order->id,
            'tenant' => [
                'companyId' => $user->company_id,
                'branchId' => $user->branch_id,
            ],
            'authorizedUser' => [
                'id' => $user->id,
                'staffId' => $user->staff_id,
                'name' => $user->name,
                'role' => $user->role,
            ],
            'orderSummary' => [
                'customerId' => $customerId,
                'orderTypeId' => $orderTypeId,
                'grandTotal' => $order->grand_total,
            ],
        ], 201);
    }
}

