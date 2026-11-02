<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosCategory extends Model
{
    protected $table = 'pos_categories';

    protected $fillable = [
        'category_id', 'company_id', 'branch_id', 'parent_category_id',
        'name_en', 'name_ar', 'icon', 'sort_order', 'is_active',
    ];

    protected $casts = ['is_active' => 'boolean', 'sort_order' => 'integer'];
}
