<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * Get POS Management Reports telemetry.
     * Enforces strict RBAC: Staff role blocked with 403 Forbidden.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized: Session required',
            ], 401);
        }

        // Strict RBAC: Staff cannot access management reports
        $permissions = $user->permissions ?? [];
        if ($user->role === 'staff' || !in_array('reports', $permissions)) {
            return response()->json([
                'success' => false,
                'error' => 'ACCESS DENIED: Insufficient permissions for management reports',
            ], 403);
        }

        // Authorized Cashier / Admin response
        return response()->json([
            'success' => true,
            'companyId' => $user->company_id,
            'branchId' => $user->branch_id,
            'authorizedUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
            ],
            'message' => 'Authorized access to management report telemetry',
            'summary' => [
                'totalOrdersToday' => 12,
                'totalSalesToday' => 1450.50,
                'activeShifts' => 1,
            ],
        ], 200);
    }
}

