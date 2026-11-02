<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\Branch;
use App\Models\Company;
use App\Models\User;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('pos:provision-tenant {--force : Confirm provisioning while APP_ENV=production}', function () {
    if (app()->environment('production') && !$this->option('force')) {
        $this->error('Production provisioning requires the explicit --force option.');
        return 1;
    }
    if (app()->environment('production') && !$this->confirm('Create a new company, branch and administrator account in the configured production database?')) {
        $this->warn('Provisioning cancelled.');
        return 1;
    }

    $companyId = trim($this->ask('Company ID (letters, numbers, dash, underscore)'));
    $companyName = trim($this->ask('Company name'));
    $branchCode = trim($this->ask('Initial branch code'));
    $branchName = trim($this->ask('Initial branch name'));
    $adminName = trim($this->ask('Administrator name'));
    $email = strtolower(trim($this->ask('Administrator email')));
    $pin = (string)$this->secret('Administrator 4-digit POS PIN');

    if (!preg_match('/^[A-Za-z0-9_-]{2,80}$/', $companyId) || !preg_match('/^[A-Za-z0-9_-]{2,80}$/', $branchCode)) {
        $this->error('Company ID and branch code must be 2–80 letters, numbers, dashes or underscores.');
        return 1;
    }
    if ($companyName === '' || $branchName === '' || $adminName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $this->error('Company, branch and administrator details must be valid and non-empty.');
        return 1;
    }
    if (!preg_match('/^\d{4}$/', $pin) || in_array($pin, ['0000', '1234'], true)) {
        $this->error('PIN must be four digits and cannot be a reserved demo PIN.');
        return 1;
    }
    foreach (User::whereNotNull('pin_hash')->whereNotNull('salt')->get(['pin_hash', 'salt']) as $existingCredential) {
        $candidateHash = hash_pbkdf2('sha256', $pin, $existingCredential->salt, 100000, 128, false);
        if (hash_equals($existingCredential->pin_hash, $candidateHash)) {
            $this->error('This PIN is already assigned. Choose a unique PIN before provisioning.');
            return 1;
        }
    }
    if (Company::whereKey($companyId)->exists() || User::where('email', $email)->exists()) {
        $this->error('Company ID already exists or administrator email is already assigned.');
        return 1;
    }

    $salt = bin2hex(random_bytes(32));
    $staffId = 'ADM-'.Str::upper(Str::random(12));
    DB::transaction(function () use ($companyId, $companyName, $branchCode, $branchName, $adminName, $email, $pin, $salt, $staffId) {
        Company::create(['id' => $companyId, 'name' => $companyName, 'currency' => 'SAR', 'status' => 'active']);
        Branch::create(['company_id' => $companyId, 'code' => $branchCode, 'name' => $branchName, 'timezone' => 'Asia/Riyadh', 'status' => 'active']);
        User::create([
            'name' => $adminName, 'name_en' => $adminName, 'email' => $email,
            'password' => Hash::make(Str::random(64)), 'staff_id' => $staffId, 'role' => 'admin',
            'pin_hash' => hash_pbkdf2('sha256', $pin, $salt, 100000, 128, false), 'salt' => $salt,
            'company_id' => $companyId, 'branch_id' => $branchCode, 'can_open_sidebar' => true,
            'permissions' => ['pos_login', 'pos_orders', 'open_sidebar', 'reports', 'shifts', 'shift_manage', 'orders_cancel', 'catalog_manage', 'branches_manage'],
        ]);
    });
    $this->info('Tenant and first administrator created. The PIN is not stored in plaintext; deliver it to the account owner through an approved secure channel.');
    return 0;
})->purpose('Provision an isolated company, first branch and administrator account');
