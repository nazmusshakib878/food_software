<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosOrderItem extends Model
{
    protected $table = 'pos_order_items';

    protected $fillable = [
        'order_id',
        'item_id',
        'en_name',
        'ar_name',
        'price',
        'qty',
        'addons',
        'modifiers',
        'note',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'qty' => 'integer',
        'addons' => 'array',
        'modifiers' => 'array',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(PosOrder::class, 'order_id', 'id');
    }
}

