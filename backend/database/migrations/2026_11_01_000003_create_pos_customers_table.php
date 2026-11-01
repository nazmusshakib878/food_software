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
        Schema::create('pos_customers', function (Blueprint $table) {
            $table->string('id')->primary(); // cash, hungerstation, jahiz, ninja, keeta, mrsool, toyou, thechefz, management, mosque
            $table->string('name_en');
            $table->string('name_ar');
            $table->boolean('is_partner')->default(false);
            $table->string('order_type_id')->default('delivery');
            $table->string('display_en')->nullable();
            $table->string('display_ar')->nullable();
            $table->string('policy')->default('NORMAL');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pos_customers');
    }
};

