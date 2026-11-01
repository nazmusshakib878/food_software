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
        Schema::create('pos_orders', function (Blueprint $table) {
            $table->string('id')->primary(); // ORD-1014
            $table->unsignedBigInteger('seq')->nullable();
            $table->string('shift_id')->nullable();
            $table->string('user_id')->nullable();
            $table->string('staff_id')->nullable();
            $table->string('company_id')->default('CMP-001');
            $table->string('branch_id')->default('BR-001');
            $table->string('customer_id')->default('cash');
            $table->string('customer_name')->nullable();
            $table->string('order_type_id')->default('delivery');
            $table->string('order_type_name')->nullable();
            $table->string('delivery_display')->nullable();
            $table->string('table')->default('-');
            $table->string('status')->default('completed'); // new, completed, cancelled
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax', 12, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(15);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('grand_total', 12, 2)->default(0);
            $table->decimal('paid', 12, 2)->default(0);
            $table->decimal('change', 12, 2)->default(0);
            $table->string('method')->default('Cash');
            $table->text('notes')->nullable();
            $table->string('phone')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pos_orders');
    }
};

