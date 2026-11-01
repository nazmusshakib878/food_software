<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    /**
     * Authenticate POS User via 4-Digit PIN.
     * Enforces salted PBKDF2/Bcrypt hash verification, rate-limiting & legacy rejection.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'pin' => ['required', 'string', 'size:4', 'regex:/^\d{4}$/'],
        ]);

        $pin = $request->input('pin');
        $ip = $request->ip();
        $throttleKey = 'pos_login|' . $ip;

        // Rate-limiting check (5 attempts max, 15 min lockout)
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'success' => false,
                'error' => "Too many failed login attempts. Locked for {$seconds}s.",
                'retryAfter' => $seconds,
            ], 429);
        }

        // Explicitly reject legacy demo PINs
        if ($pin === '0000' || $pin === '1234') {
            RateLimiter::hit($throttleKey, 900);
            return response()->json([
                'success' => false,
                'error' => 'Invalid PIN. Access denied.',
            ], 401);
        }

        // Search authorized users
        $users = User::all();
        $authenticatedUser = null;

        foreach ($users as $u) {
            // Check PBKDF2 hash if salt exists
            if (!empty($u->salt) && !empty($u->pin_hash)) {
                $calcHash = hash_pbkdf2('sha256', $pin, $u->salt, 100000, 64, false);
                if (hash_equals($u->pin_hash, $calcHash)) {
                    $authenticatedUser = $u;
                    break;
                }
            }

            // Fallback to standard Bcrypt password
            if (Hash::check($pin, $u->password)) {
                $authenticatedUser = $u;
                break;
            }
        }

        if (!$authenticatedUser) {
            RateLimiter::hit($throttleKey, 900);
            return response()->json([
                'success' => false,
                'error' => 'Invalid PIN. Access denied.',
            ], 401);
        }

        // Successful authentication: clear rate limiter
        RateLimiter::clear($throttleKey);

        // Revoke previous tokens for this user on this device if needed
        $token = $authenticatedUser->createToken('pos_session')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Authenticated successfully',
            'session' => [
                'token' => $token,
                'user' => [
                    'id' => $authenticatedUser->id,
                    'staffId' => $authenticatedUser->staff_id,
                    'name' => $authenticatedUser->name,
                    'nameEn' => $authenticatedUser->name_en ?? $authenticatedUser->name,
                    'nameAr' => $authenticatedUser->name_ar ?? 'موظف',
                    'role' => $authenticatedUser->role,
                    'companyId' => $authenticatedUser->company_id,
                    'branchId' => $authenticatedUser->branch_id,
                    'canOpenSidebar' => (bool)$authenticatedUser->can_open_sidebar,
                    'permissions' => $authenticatedUser->permissions ?? [],
                ],
            ],
        ], 200);
    }

    /**
     * Get currently authenticated session user.
     */
    public function session(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized: Session expired or invalid',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'staffId' => $user->staff_id,
                'name' => $user->name,
                'nameEn' => $user->name_en ?? $user->name,
                'nameAr' => $user->name_ar ?? 'موظف',
                'role' => $user->role,
                'companyId' => $user->company_id,
                'branchId' => $user->branch_id,
                'canOpenSidebar' => (bool)$user->can_open_sidebar,
                'permissions' => $user->permissions ?? [],
            ],
        ], 200);
    }

    /**
     * Revoke current session token on Logout.
     */
    public function logout(Request $request): JsonResponse
    {
        if ($request->user()) {
            $request->user()->currentAccessToken()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ], 200);
    }
}

