<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('role', 'staff')->select(['id', 'permissions'])->orderBy('id')->get()
            ->each(function ($user): void {
                $permissions = is_array($user->permissions)
                    ? $user->permissions
                    : (json_decode((string) $user->permissions, true) ?: []);
                if (!in_array('staff_shifts', $permissions, true)) {
                    $permissions[] = 'staff_shifts';
                    DB::table('users')->where('id', $user->id)->update(['permissions' => json_encode(array_values($permissions))]);
                }
            });
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'staff')->select(['id', 'permissions'])->orderBy('id')->get()
            ->each(function ($user): void {
                $permissions = is_array($user->permissions)
                    ? $user->permissions
                    : (json_decode((string) $user->permissions, true) ?: []);
                $permissions = array_values(array_filter($permissions, fn ($permission) => $permission !== 'staff_shifts'));
                DB::table('users')->where('id', $user->id)->update(['permissions' => json_encode($permissions)]);
            });
    }
};
