<?php

namespace App\Console\Commands;

use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ProvisionInitialPosAccounts extends Command
{
    protected $signature = 'pos:provision-initial-accounts {--dry-run : Validate only; do not write} {--force : Required in production for writes}';
    protected $description = 'Provision the initial tenant-scoped POS accounts from secure environment PIN values';

    public function handle(): int
    {
        $accounts = [
            ['staff_id' => 'CASHIER-001', 'name' => 'Cashier 1', 'email' => 'cashier-001@nurfoodes.invalid', 'role' => 'cashier', 'pin_env' => 'NURPOS_INITIAL_CASHIER_PIN', 'sidebar' => true, 'permissions' => ['pos_login', 'pos_orders', 'open_sidebar', 'invoice_reports', 'items_report', 'daily_shifts', 'reports', 'shifts', 'branch_shift_manage']],
            ['staff_id' => 'STAFF-001', 'name' => 'Staff 1', 'email' => 'staff-001@nurfoodes.invalid', 'role' => 'staff', 'pin_env' => 'NURPOS_INITIAL_STAFF_1_PIN', 'sidebar' => false, 'permissions' => ['pos_login', 'pos_orders', 'staff_shifts', 'branch_shift_manage']],
            ['staff_id' => 'STAFF-002', 'name' => 'Staff 2', 'email' => 'staff-002@nurfoodes.invalid', 'role' => 'staff', 'pin_env' => 'NURPOS_INITIAL_STAFF_2_PIN', 'sidebar' => false, 'permissions' => ['pos_login', 'pos_orders', 'staff_shifts', 'branch_shift_manage']],
            ['staff_id' => 'ADMIN-001', 'name' => 'Administrator', 'email' => 'admin-001@nurfoodes.invalid', 'role' => 'admin', 'pin_env' => 'NURPOS_INITIAL_ADMIN_PIN', 'sidebar' => true, 'permissions' => ['pos_login', 'pos_orders', 'open_sidebar', 'reports', 'shifts', 'shift_manage', 'orders_cancel', 'catalog_manage', 'branches_manage']],
        ];
        $pins = [];
        foreach ($accounts as $account) {
            $pin = (string) env($account['pin_env'], '');
            if (!preg_match('/^\d{4}$/', $pin) || in_array($pin, ['0000', '1234'], true)) {
                $this->error("{$account['pin_env']} must be a non-reserved four-digit PIN.");
                return self::FAILURE;
            }
            $pins[$account['staff_id']] = $pin;
        }
        if (count(array_unique($pins)) !== count($pins)) {
            $this->error('Each initial account must have a unique PIN.');
            return self::FAILURE;
        }
        if (app()->environment('production') && !$this->option('dry-run') && !$this->option('force')) {
            $this->error('Production writes require --force.');
            return self::FAILURE;
        }

        $companyId = 'CMP-001'; $branchCode = 'BR-001';
        $company = Company::query()->whereKey($companyId)->where('status', 'active')->first();
        $branch = Branch::query()->where('company_id', $companyId)->where('code', $branchCode)->where('status', 'active')->first();
        if (!$company || !$branch) { $this->error('CMP-001 / BR-001 is not an active tenant branch.'); return self::FAILURE; }

        $existing = User::query()->whereIn('staff_id', array_keys($pins))->get()->keyBy('staff_id');
        foreach ($accounts as $account) {
            if (isset($existing[$account['staff_id']]) && ($existing[$account['staff_id']]->company_id !== $companyId || $existing[$account['staff_id']]->branch_id !== $branchCode || $existing[$account['staff_id']]->role !== $account['role'])) {
                $this->error("{$account['staff_id']} already belongs to a different tenant, branch, or role; no changes made."); return self::FAILURE;
            }
        }
        if ($this->option('dry-run')) {
            $this->info("Dry run target: {$companyId} / {$branchCode}; no data changed.");
            $this->table(['Staff ID', 'Role', 'Status'], array_map(fn ($account) => [
                $account['staff_id'], $account['role'], isset($existing[$account['staff_id']]) ? 'exists (unchanged)' : 'eligible for creation',
            ], $accounts));
            return self::SUCCESS;
        }

        DB::transaction(function () use ($accounts, $pins, $companyId, $branchCode, $existing) {
            foreach ($accounts as $account) {
                if (isset($existing[$account['staff_id']])) continue; // Never reset an existing PIN.
                $salt = bin2hex(random_bytes(32));
                User::create([
                    'name' => $account['name'], 'name_en' => $account['name'], 'email' => $account['email'],
                    'password' => Hash::make(Str::random(64)), 'staff_id' => $account['staff_id'], 'role' => $account['role'],
                    'pin_hash' => hash_pbkdf2('sha256', $pins[$account['staff_id']], $salt, 100000, 128, false), 'salt' => $salt,
                    'company_id' => $companyId, 'branch_id' => $branchCode, 'can_open_sidebar' => $account['sidebar'], 'permissions' => $account['permissions'],
                ]);
            }
        }, 3);
        $this->info('Initial POS accounts provisioned. Existing accounts were left unchanged.');
        return self::SUCCESS;
    }
}
