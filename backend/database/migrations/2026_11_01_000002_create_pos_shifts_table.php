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
        Schema::create('pos_shifts', function (Blueprint $table) {
            $table->string('id')->primary(); // e.g. SH-101
            $table->string('shift_number')->nullable();
            $table->string('cashier');
            $table->string('cashier_en')->nullable();
            $table->string('cashier_ar')->nullable();
            $table->string('user_id')->nullable();
            $table->string('staff_id')->nullable();
            $table->string('company_id')->default('CMP-001');
            $table->string('branch_id')->default('BR-001');
            $table->timestamp('opened_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            $table->string('status')->default('active'); // active, closed
            $table->decimal('opening_cash', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pos_shifts');
    }
};

