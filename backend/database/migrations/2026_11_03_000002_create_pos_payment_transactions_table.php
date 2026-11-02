<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_payment_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('order_id');
            $table->string('company_id');
            $table->string('branch_id');
            $table->string('method', 40);
            $table->decimal('amount', 12, 2);
            $table->string('status', 40)->default('recorded_manual');
            $table->string('provider', 80)->nullable();
            $table->string('provider_reference')->nullable();
            $table->string('recorded_by')->nullable();
            $table->timestamps();
            $table->foreign('order_id', 'pos_payment_order_fk')->references('id')->on('pos_orders')->cascadeOnDelete();
            $table->foreign(['company_id', 'branch_id'], 'pos_payment_tenant_branch_fk')
                ->references(['company_id', 'code'])->on('branches')->restrictOnDelete();
            $table->index(['company_id', 'branch_id', 'status', 'created_at'], 'pos_payment_tenant_status_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_payment_transactions');
    }
};
