<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_categories', function (Blueprint $table) {
            $table->id();
            $table->string('category_id');
            $table->string('company_id');
            $table->string('branch_id');
            $table->string('parent_category_id')->nullable();
            $table->string('name_en');
            $table->string('name_ar');
            $table->string('icon')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['company_id', 'branch_id', 'category_id'], 'pos_categories_tenant_id_unique');
            $table->index(['company_id', 'branch_id', 'is_active', 'sort_order'], 'pos_categories_tenant_active_index');
        });

        Schema::create('pos_products', function (Blueprint $table) {
            $table->id();
            $table->string('product_id');
            $table->string('company_id');
            $table->string('branch_id');
            $table->string('category_id');
            $table->string('code')->nullable();
            $table->string('name_en');
            $table->string('name_ar');
            $table->string('subtitle_en')->nullable();
            $table->string('subtitle_ar')->nullable();
            $table->string('image')->nullable();
            $table->decimal('price', 12, 2);
            $table->decimal('tax_rate', 5, 2)->default(15);
            $table->boolean('available')->default(true);
            $table->boolean('track_stock')->default(false);
            $table->decimal('stock_on_hand', 12, 3)->nullable();
            $table->decimal('low_stock_threshold', 12, 3)->nullable();
            $table->timestamps();
            $table->unique(['company_id', 'branch_id', 'product_id'], 'pos_products_tenant_id_unique');
            $table->index(['company_id', 'branch_id', 'category_id', 'available'], 'pos_products_catalog_index');
        });

        Schema::create('pos_inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->string('company_id');
            $table->string('branch_id');
            $table->string('product_id');
            $table->string('user_id')->nullable();
            $table->string('order_id')->nullable();
            $table->decimal('quantity_delta', 12, 3);
            $table->decimal('quantity_after', 12, 3);
            $table->string('reason', 40);
            $table->text('note')->nullable();
            $table->timestamps();
            $table->index(['company_id', 'branch_id', 'product_id', 'created_at'], 'pos_inventory_tenant_product_date_index');
            $table->index(['company_id', 'branch_id', 'order_id'], 'pos_inventory_order_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_inventory_movements');
        Schema::dropIfExists('pos_products');
        Schema::dropIfExists('pos_categories');
    }
};
