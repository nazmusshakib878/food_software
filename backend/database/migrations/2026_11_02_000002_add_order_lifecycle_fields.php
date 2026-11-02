<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_orders', function (Blueprint $table) {
            $table->string('client_order_id')->nullable()->after('id');
            $table->string('payment_status')->default('recorded')->after('status');
            $table->timestamp('cancelled_at')->nullable()->after('payment_status');
            $table->text('cancellation_reason')->nullable()->after('cancelled_at');
            $table->json('payment_breakdown')->nullable()->after('method');
            $table->unique(['company_id', 'branch_id', 'client_order_id'], 'pos_orders_tenant_client_id_unique');
            $table->index(['company_id', 'branch_id', 'status', 'created_at'], 'pos_orders_tenant_status_date_index');
        });
    }

    public function down(): void
    {
        Schema::table('pos_orders', function (Blueprint $table) {
            $table->dropUnique('pos_orders_tenant_client_id_unique');
            $table->dropIndex('pos_orders_tenant_status_date_index');
            $table->dropColumn(['client_order_id', 'payment_status', 'cancelled_at', 'cancellation_reason', 'payment_breakdown']);
        });
    }
};
