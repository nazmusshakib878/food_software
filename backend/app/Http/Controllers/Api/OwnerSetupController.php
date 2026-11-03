<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class OwnerSetupController extends Controller
{
    public function status(): JsonResponse
    {
        if (!$this->configured() || User::query()->exists()) {
            return response()->json(['available' => false], 404);
        }

        return response()->json([
            'available' => true,
            'companies' => Company::query()->where('status', 'active')
                ->with(['branches' => fn ($query) => $query->select('id', 'company_id', 'code', 'name')->where('status', 'active')->orderBy('code')])
                ->orderBy('id')->get(['id', 'name']),
        ])->header('Cache-Control', 'no-store');
    }

    public function create(Request $request): JsonResponse
    {
        $token = (string) config('app.owner_setup_token', '');
        $provided = (string) $request->header('X-Owner-Setup-Token', '');
        if (!$this->configured() || strlen($provided) < 43 || !hash_equals($token, $provided)) {
            return response()->json(['message' => 'Owner setup is unavailable.'], 404);
        }
        if (User::query()->exists()) {
            return response()->json(['message' => 'Owner setup is unavailable.'], 404);
        }

        if (app()->environment('production') && !$request->isSecure()) {
            return response()->json(['message' => 'Owner setup requires HTTPS.'], 400);
        }

        $ip = $request->ip() ?? 'unknown';
        $key = 'owner_setup:'.hash('sha256', $ip);
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(['message' => 'Too many setup attempts. Try again later.'], 429)
                ->header('Retry-After', (string) RateLimiter::availableIn($key));
        }
        RateLimiter::hit($key, 900);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'staff_id' => ['required', 'string', 'min:2', 'max:80', 'regex:/^[A-Za-z0-9_-]+$/', 'unique:users,staff_id'],
            'company_id' => ['required', 'string', Rule::exists('companies', 'id')],
            'branch_id' => ['required', 'string'],
            'pin' => ['required', 'string', 'size:4', 'regex:/^\d{4}$/', 'confirmed'],
        ]);
        $pin = $validated['pin'];
        if (in_array($pin, ['0000', '1111', '1234', '1050', '1051', '1052'], true)
            || preg_match('/^(\d)\1{3}$/', $pin)) {
            return response()->json(['message' => 'Choose a PIN that is not a common or previously disclosed code.'], 422);
        }

        try {
            $owner = DB::transaction(function () use ($validated, $pin) {
                // Lock the existing tenant row so simultaneous bootstrap requests cannot both pass
                // the empty-users check. No company or branch rows are created or changed.
                $company = Company::query()->whereKey($validated['company_id'])->lockForUpdate()->first();
                abort_unless($company && $company->status === 'active', 422, 'The selected company is unavailable.');
                abort_if(User::query()->exists(), 409, 'Owner setup has already been completed.');

                $branch = Branch::query()->where('company_id', $company->id)
                    ->where('code', $validated['branch_id'])->lockForUpdate()->first();
                abort_unless($branch && $branch->status === 'active', 422, 'The selected branch does not belong to this active company.');

                $salt = bin2hex(random_bytes(32));
                return User::create([
                    'name' => trim($validated['name']),
                    'name_en' => trim($validated['name']),
                    'email' => strtolower(trim($validated['email'])),
                    'password' => Hash::make(Str::random(64)),
                    'staff_id' => trim($validated['staff_id']),
                    'role' => 'admin',
                    'pin_hash' => hash_pbkdf2('sha256', $pin, $salt, 100000, 128, false),
                    'salt' => $salt,
                    'company_id' => $company->id,
                    'branch_id' => $branch->code,
                    'can_open_sidebar' => true,
                    'permissions' => ['pos_login', 'pos_orders', 'open_sidebar', 'reports', 'shifts', 'shift_manage', 'orders_cancel', 'catalog_manage', 'branches_manage'],
                ]);
            }, 3);
        } catch (\Illuminate\Database\QueryException $exception) {
            if (User::query()->exists()) {
                return response()->json(['message' => 'Owner setup has already been completed.'], 409);
            }
            throw $exception;
        }

        RateLimiter::clear($key);
        return response()->json(['created' => true, 'staffId' => $owner->staff_id], 201);
    }

    private function configured(): bool
    {
        return strlen((string) config('app.owner_setup_token', '')) >= 43;
    }
}
