<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tenantTables = [
        'users', 'pos_shifts', 'pos_orders', 'pos_categories', 'pos_products', 'pos_inventory_movements',
    ];

    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->string('tax_number')->nullable();
            $table->string('currency', 3)->default('SAR');
            $table->string('status', 24)->default('active');
            $table->timestamps();
        });

        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('company_id');
            $table->string('code');
            $table->string('name');
            $table->string('timezone', 64)->default('Asia/Riyadh');
            $table->string('status', 24)->default('active');
            $table->timestamps();
            $table->unique(['company_id', 'code'], 'branches_company_code_unique');
            $table->foreign('company_id', 'branches_company_fk')->references('id')->on('companies')->restrictOnDelete();
        });

        // Legacy schema defaults target this tenant even in a fresh empty database.
        $now = now();
        DB::table('companies')->insertOrIgnore([
            'id' => 'CMP-001', 'name' => 'Company CMP-001', 'currency' => 'SAR', 'status' => 'active',
            'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('branches')->insertOrIgnore([
            'company_id' => 'CMP-001', 'code' => 'BR-001', 'name' => 'Branch BR-001', 'timezone' => 'Asia/Riyadh',
            'status' => 'active', 'created_at' => $now, 'updated_at' => $now,
        ]);

        // Preserve existing tenant keys while backfilling directory records before adding constraints.
        foreach ($this->tenantTables as $table) {
            if (!Schema::hasTable($table)) continue;
            foreach (DB::table($table)->select('company_id', 'branch_id')->distinct()->get() as $tenant) {
                if (!$tenant->company_id || !$tenant->branch_id) continue;
                $now = now();
                DB::table('companies')->insertOrIgnore([
                    'id' => $tenant->company_id, 'name' => 'Company '.$tenant->company_id,
                    'currency' => 'SAR', 'status' => 'active', 'created_at' => $now, 'updated_at' => $now,
                ]);
                DB::table('branches')->insertOrIgnore([
                    'company_id' => $tenant->company_id, 'code' => $tenant->branch_id,
                    'name' => 'Branch '.$tenant->branch_id, 'timezone' => 'Asia/Riyadh', 'status' => 'active',
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            }
        }

        foreach ($this->tenantTables as $tableName) {
            if (!Schema::hasTable($tableName)) continue;
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->foreign(['company_id', 'branch_id'], $tableName.'_tenant_branch_fk')
                    ->references(['company_id', 'code'])->on('branches')->restrictOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (array_reverse($this->tenantTables) as $tableName) {
            if (!Schema::hasTable($tableName)) continue;
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->dropForeign($tableName.'_tenant_branch_fk');
            });
        }
        Schema::dropIfExists('branches');
        Schema::dropIfExists('companies');
    }
};
