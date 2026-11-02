<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosInventoryMovement extends Model
{
    protected $table = 'pos_inventory_movements';

    protected $fillable = [
        'company_id', 'branch_id', 'product_id', 'user_id', 'order_id',
        'quantity_delta', 'quantity_after', 'reason', 'note',
    ];

    protected $casts = ['quantity_delta' => 'decimal:3', 'quantity_after' => 'decimal:3'];
}
