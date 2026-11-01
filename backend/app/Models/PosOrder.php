<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosOrder extends Model
{
    protected $table = 'pos_orders';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'seq',
        'shift_id',
        'user_id',
        'staff_id',
        'company_id',
        'branch_id',
        'customer_id',
        'customer_name',
        'order_type_id',
        'order_type_name',
        'delivery_display',
        'table',
        'status',
        'subtotal',
        'tax',
        'tax_rate',
        'discount',
        'grand_total',
        'paid',
        'change',
        'method',
        'notes',
        'phone',
        'raw_payload',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'discount' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'paid' => 'decimal:2',
        'change' => 'decimal:2',
        'raw_payload' => 'array',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PosOrderItem::class, 'order_id', 'id');
    }
}

