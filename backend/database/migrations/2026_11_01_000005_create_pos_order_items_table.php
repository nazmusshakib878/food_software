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
        Schema::create('pos_order_items', function (Blueprint $table) {
            $table->id();
            $table->string('order_id')->index();
            $table->string('item_id');
            $table->string('en_name');
            $table->string('ar_name')->nullable();
            $table->decimal('price', 12, 2)->default(0);
            $table->integer('qty')->default(1);
            $table->json('addons')->nullable();
            $table->json('modifiers')->nullable();
            $table->string('note')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('pos_orders')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pos_order_items');
    }
};

