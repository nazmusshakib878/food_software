<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const USERS = [
        'STF-1050' => 'cashier',
        'STF-1051' => 'staff',
        'STF-1052' => 'staff',
    ];

    public function up(): void
    {
        foreach (self::USERS as $staffId => $role) {
            $user = DB::table('users')->where('staff_id', $staffId)->where('role', $role)->first(['id', 'permissions']);
            if (!$user) continue;

            $permissions = is_array($user->permissions)
                ? $user->permissions
                : (json_decode((string) $user->permissions, true) ?: []);
            if (!in_array('branch_shift_manage', $permissions, true)) {
                $permissions[] = 'branch_shift_manage';
                DB::table('users')->where('id', $user->id)->update(['permissions' => json_encode(array_values($permissions))]);
            }
        }
    }

    public function down(): void
    {
        foreach (self::USERS as $staffId => $role) {
            $user = DB::table('users')->where('staff_id', $staffId)->where('role', $role)->first(['id', 'permissions']);
            if (!$user) continue;

            $permissions = is_array($user->permissions)
                ? $user->permissions
                : (json_decode((string) $user->permissions, true) ?: []);
            $permissions = array_values(array_filter($permissions, fn ($permission) => $permission !== 'branch_shift_manage'));
            DB::table('users')->where('id', $user->id)->update(['permissions' => json_encode($permissions)]);
        }
    }
};
