<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PosShift;
use App\Models\Company;
use App\Models\Branch;
use App\Models\PosOrder;
use App\Models\PosPaymentTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ShiftController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->canUseShiftModule($user)) {
            return response()->json(['success' => false, 'error' => 'Shift access denied.'], 403);
        }
        $query = PosShift::where('company_id', $user->company_id)->where('branch_id', $user->branch_id);
        if (!$this->canManageBranchShifts($user)) {
            $query->where('user_id', (string) $user->id);
        }
        $rows = $query->latest('opened_at')->limit(100)->get();
        return response()->json(['success' => true, 'shifts' => $rows]);
    }

    /**
     * Get the active POS shift.
     */
    public function active(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->canUseShiftModule($user)) {
            return response()->json(['success' => false, 'error' => 'Shift access denied.'], 403);
        }
        $shift = PosShift::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->where('user_id', (string) $user->id)
            ->where('status', 'active')
            ->latest()->first();

        return response()->json([
            'success' => true,
            'activeShift' => $shift,
        ]);
    }

    /** Return actual stored shift, company, branch and sales data for an authorized shift. */
    public function report(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $shift = $this->authorizedShift($user, $id);
        if (!$shift) return response()->json(['success' => false, 'error' => 'Shift not found'], 404);

        $orders = PosOrder::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->where('shift_id', $shift->id);
        $summary = (clone $orders)->selectRaw(
            "COUNT(*) as order_count, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count, COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN subtotal ELSE 0 END), 0) as subtotal, COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN tax ELSE 0 END), 0) as tax, COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN discount ELSE 0 END), 0) as discount, COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN grand_total ELSE 0 END), 0) as grand_total"
        )->first();

        $company = Company::whereKey($user->company_id)->first();
        $branch = Branch::where('company_id', $user->company_id)->where('code', $user->branch_id)->first();
        $paidOrders = (clone $orders)->where('status', '!=', 'cancelled')->select('id');
        $payments = PosPaymentTransaction::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->whereIn('order_id', $paidOrders)
            ->selectRaw('method, COALESCE(SUM(amount), 0) as amount')
            ->groupBy('method')
            ->orderBy('method')
            ->get();

        return response()->json([
            'success' => true,
            'shift' => $shift,
            'company' => $company,
            'branch' => $branch,
            'payments' => $payments,
            'summary' => [
                'orderCount' => (int) ($summary->order_count ?? 0),
                'cancelledCount' => (int) ($summary->cancelled_count ?? 0),
                'subtotal' => (float) ($summary->subtotal ?? 0),
                'tax' => (float) ($summary->tax ?? 0),
                'discount' => (float) ($summary->discount ?? 0),
                'grandTotal' => (float) ($summary->grand_total ?? 0),
            ],
        ]);
    }

    /** Return invoice records tied to this authorized shift only. */
    public function invoices(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $shift = $this->authorizedShift($user, $id);
        if (!$shift) return response()->json(['success' => false, 'error' => 'Shift not found'], 404);

        $orders = PosOrder::with('items')
            ->where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->where('shift_id', $shift->id)
            ->latest()
            ->limit(500)
            ->get();

        return response()->json(['success' => true, 'orders' => $orders]);
    }

    private function authorizedShift($user, string $id): ?PosShift
    {
        if (!$this->canUseShiftModule($user)) return null;
        $query = PosShift::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->whereKey($id);

        if (!$this->canManageBranchShifts($user)) {
            $query->where('user_id', (string) $user->id);
        }

        return $query->first();
    }

    /**
     * Start/Create a new POS shift.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->canUseShiftModule($user)) {
            return response()->json(['success' => false, 'error' => 'Shift management permission required.'], 403);
        }

        $data = $request->validate([
            'openingCash' => ['required', 'numeric', 'min:0', 'max:999999999'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $shift = DB::transaction(function () use ($user, $data) {
            // Serialize openings for this identity and prevent duplicate active
            // shifts when this user taps twice or starts a second device.
            $user->newQuery()->whereKey($user->id)->lockForUpdate()->first();
            $active = PosShift::where('company_id', $user->company_id)
                ->where('branch_id', $user->branch_id)
                ->where('user_id', (string) $user->id)
                ->where('status', 'active')
                ->lockForUpdate()
                ->first();
            if ($active) return null;

            $nextSeq = (int) (PosShift::where('company_id', $user->company_id)->where('branch_id', $user->branch_id)->max('shift_number') ?? 100) + 1;
            return PosShift::create([
                'id' => 'SH-'.$nextSeq.'-'.Str::upper(Str::random(8)),
                'shift_number' => (string) $nextSeq,
                'cashier' => $user->name,
                'cashier_en' => $user->name_en ?? $user->name,
                'cashier_ar' => $user->name_ar ?? $user->name,
                'user_id' => (string) $user->id,
                'staff_id' => $user->staff_id,
                'company_id' => $user->company_id,
                'branch_id' => $user->branch_id,
                'opened_at' => now(),
                'status' => 'active',
                'opening_cash' => $data['openingCash'],
                'notes' => $data['notes'] ?? null,
            ]);
        }, 3);

        if (!$shift) return response()->json(['success' => false, 'error' => 'An active shift already exists for this user.'], 409);

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
        $user = $request->user();
        if (!$this->canUseShiftModule($user)) {
            return response()->json(['success' => false, 'error' => 'Shift management permission required.'], 403);
        }
        $mayManageAll = $this->canManageBranchShifts($user);
        $shift = $this->authorizedShift($user, $id);
        if (!$shift) return response()->json(['success' => false, 'error' => 'Shift not found'], 404);

        $shift = DB::transaction(function () use ($user, $id, $mayManageAll) {
            $locked = PosShift::where('company_id', $user->company_id)
                ->where('branch_id', $user->branch_id)
                ->whereKey($id)
                ->lockForUpdate()
                ->first();

            if (!$locked) return null;
            if (!$mayManageAll && (string) $locked->user_id !== (string) $user->id) return 'forbidden';
            if ($locked->status !== 'active') return 'closed';

            $locked->update(['status' => 'closed', 'closed_at' => now()]);
            return $locked->fresh();
        }, 3);

        if ($shift === null) return response()->json(['success' => false, 'error' => 'Shift not found'], 404);
        if ($shift === 'forbidden') return response()->json(['success' => false, 'error' => 'You may only close your own shift.'], 403);
        if ($shift === 'closed') return response()->json(['success' => false, 'error' => 'Shift is already closed.'], 409);

        return response()->json([
            'success' => true,
            'message' => 'Shift closed successfully',
            'shift' => $shift,
        ]);
    }

    /** Close every active shift for the authenticated user's own branch. */
    public function closeBranch(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->canManageBranchShifts($user)) {
            return response()->json(['success' => false, 'error' => 'Branch shift management permission required.'], 403);
        }

        $closed = DB::transaction(function () use ($user) {
            $activeShifts = PosShift::where('company_id', $user->company_id)
                ->where('branch_id', $user->branch_id)
                ->where('status', 'active')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($activeShifts as $shift) {
                if ($shift->status !== 'active') continue;
                $shift->update(['status' => 'closed', 'closed_at' => now()]);
            }

            return $activeShifts->map(fn (PosShift $shift) => $shift->fresh())->values();
        }, 3);

        return response()->json([
            'success' => true,
            'closedCount' => $closed->count(),
            'shifts' => $closed,
        ]);
    }

    private function canUseShiftModule($user): bool
    {
        if ($user->role === 'admin') return true;
        $permissions = $user->permissions ?? [];
        if ($user->role === 'staff') return in_array('staff_shifts', $permissions, true);
        if ($user->role === 'cashier') return in_array('shifts', $permissions, true)
            || in_array('shift_manage', $permissions, true)
            || in_array('branch_shift_manage', $permissions, true);

        return in_array('shift_manage', $permissions, true);
    }

    private function canManageBranchShifts($user): bool
    {
        if ($user->role === 'admin') return true;
        $permissions = $user->permissions ?? [];
        return in_array('shift_manage', $permissions, true)
            || in_array('branch_shift_manage', $permissions, true);
    }
}

