<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PosShift;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    /**
     * Get the active POS shift.
     */
    public function active(Request $request): JsonResponse
    {
        $shift = PosShift::where('status', 'active')->latest()->first();

        return response()->json([
            'success' => true,
            'activeShift' => $shift,
        ]);
    }

    /**
     * Start/Create a new POS shift.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'openingCash' => ['required', 'numeric', 'min:0'],
        ]);

        $nextSeq = PosShift::count() + 101;
        $shiftId = 'SH-' . $nextSeq;

        $shift = PosShift::create([
            'id' => $shiftId,
            'shift_number' => (string)$nextSeq,
            'cashier' => $request->input('cashier') ?? $user->name,
            'cashier_en' => $request->input('cashierEn') ?? $user->name_en ?? $user->name,
            'cashier_ar' => $request->input('cashierAr') ?? $user->name_ar ?? 'كاشير',
            'user_id' => (string)$user->id,
            'staff_id' => $user->staff_id,
            'company_id' => $user->company_id ?? 'CMP-001',
            'branch_id' => $user->branch_id ?? 'BR-001',
            'opened_at' => now(),
            'status' => 'active',
            'opening_cash' => $request->input('openingCash'),
            'notes' => $request->input('notes'),
        ]);

        return response()->json([
            'success' => true,
            'shift' => $shift,
        ], 201);
    }

    /**
     * Close an active POS shift.
     */
    public function close(Request $request, string $id): JsonResponse
    {
        $shift = PosShift::find($id);

        if (!$shift) {
            return response()->json([
                'success' => false,
                'error' => 'Shift not found',
            ], 404);
        }

        $shift->update([
            'status' => 'closed',
            'closed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Shift closed successfully',
            'shift' => $shift,
        ]);
    }
}

