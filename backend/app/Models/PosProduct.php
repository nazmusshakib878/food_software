<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosProduct extends Model
{
    protected $table = 'pos_products';

    protected $fillable = [
        'product_id', 'company_id', 'branch_id', 'category_id', 'code',
        'name_en', 'name_ar', 'subtitle_en', 'subtitle_ar', 'image',
        'price', 'tax_rate', 'available', 'track_stock', 'stock_on_hand', 'low_stock_threshold',
    ];

    protected $casts = [
        'price' => 'decimal:2', 'tax_rate' => 'decimal:2', 'available' => 'boolean',
        'track_stock' => 'boolean', 'stock_on_hand' => 'decimal:3', 'low_stock_threshold' => 'decimal:3',
    ];
}
