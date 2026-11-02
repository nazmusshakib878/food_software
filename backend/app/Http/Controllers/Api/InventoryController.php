<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PosInventoryMovement;
use App\Models\PosProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = PosProduct::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)->where('track_stock', true);
        if ($request->boolean('lowStock')) {
            $query->whereNotNull('low_stock_threshold')->whereColumn('stock_on_hand', '<=', 'low_stock_threshold');
        }
        return response()->json(['success' => true, 'inventory' => $query->orderBy('name_en')->get()]);
    }

    public function movements(Request $request): JsonResponse
    {
        $user = $request->user();
        $rows = PosInventoryMovement::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->when($request->filled('productId'), fn ($query) => $query->where('product_id', $request->query('productId')))
            ->latest()->limit(500)->get();
        return response()->json(['success' => true, 'movements' => $rows]);
    }

    public function adjust(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'admin' && !in_array('inventory_manage', $user->permissions ?? [], true)) {
            return response()->json(['success' => false, 'error' => 'Inventory management permission required.'], 403);
        }
        $data = $request->validate([
            'productId' => ['required', 'string', 'max:100'],
            'quantityDelta' => ['required', 'numeric', 'not_in:0', 'between:-999999999,999999999'],
            'reason' => ['required', 'in:receipt,count_correction,waste,damage,other'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $product = DB::transaction(function () use ($data, $user) {
            $product = PosProduct::where('company_id', $user->company_id)
                ->where('branch_id', $user->branch_id)->where('product_id', $data['productId'])
                ->where('track_stock', true)->lockForUpdate()->firstOrFail();
            $next = round((float)$product->stock_on_hand + (float)$data['quantityDelta'], 3);
            if ($next < 0) throw ValidationException::withMessages(['quantityDelta' => ['Adjustment would make stock negative.']]);
            $product->stock_on_hand = $next;
            $product->save();
            PosInventoryMovement::create([
                'company_id' => $user->company_id, 'branch_id' => $user->branch_id,
                'product_id' => $product->product_id, 'user_id' => (string)$user->id,
                'quantity_delta' => $data['quantityDelta'], 'quantity_after' => $next,
                'reason' => $data['reason'], 'note' => $data['note'] ?? null,
            ]);
            return $product;
        }, 3);

        return response()->json(['success' => true, 'product' => $product->refresh()]);
    }
}
