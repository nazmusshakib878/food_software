<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_products', function (Blueprint $table): void {
            $table->mediumText('image')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (DB::table('pos_products')->whereRaw('LENGTH(image) > 255')->exists()) {
            throw new RuntimeException('Cannot shorten pos_products.image while values exceed 255 bytes.');
        }

        Schema::table('pos_products', function (Blueprint $table): void {
            $table->string('image')->nullable()->change();
        });
    }
};
