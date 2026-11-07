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
        if (!Schema::hasTable('pos_order_counters')) {
            Schema::create('pos_order_counters', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('company_id', 50);
                $table->string('branch_id', 50);
                $table->string('prefix', 10);
                $table->unsignedBigInteger('last_seq')->default(100);
                $table->timestamps();

                $table->unique(['company_id', 'branch_id', 'prefix'], 'pos_order_counters_tenant_prefix_unique');
            });
        }

        if (Schema::hasTable('pos_orders') && !Schema::hasColumn('pos_orders', 'order_number')) {
            Schema::table('pos_orders', function (Blueprint $table) {
                $table->string('order_number', 50)->nullable()->after('client_order_id')->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('pos_orders') && Schema::hasColumn('pos_orders', 'order_number')) {
            Schema::table('pos_orders', function (Blueprint $table) {
                $table->dropIndex(['order_number']);
                $table->dropColumn('order_number');
            });
        }

        Schema::dropIfExists('pos_order_counters');
    }
};
