<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosCustomer extends Model
{
    protected $table = 'pos_customers';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name_en',
        'name_ar',
        'is_partner',
        'order_type_id',
        'display_en',
        'display_ar',
        'policy',
    ];

    protected $casts = [
        'is_partner' => 'boolean',
    ];
}

