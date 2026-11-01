<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('staff_id')->nullable()->unique()->after('id');
            $table->string('name_en')->nullable()->after('name');
            $table->string('name_ar')->nullable()->after('name_en');
            $table->string('role')->default('staff')->after('name_ar'); // 'cashier', 'staff', 'admin'
            $table->string('pin_hash')->nullable()->after('password');
            $table->string('salt')->nullable()->after('pin_hash');
            $table->string('company_id')->default('CMP-001')->after('salt');
            $table->string('branch_id')->default('BR-001')->after('company_id');
            $table->boolean('can_open_sidebar')->default(false)->after('branch_id');
            $table->json('permissions')->nullable()->after('can_open_sidebar');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'staff_id',
                'name_en',
                'name_ar',
                'role',
                'pin_hash',
                'salt',
                'company_id',
                'branch_id',
                'can_open_sidebar',
                'permissions'
            ]);
        });
    }
};

