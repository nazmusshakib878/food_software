<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosShift extends Model
{
    protected $table = 'pos_shifts';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'shift_number',
        'cashier',
        'cashier_en',
        'cashier_ar',
        'user_id',
        'staff_id',
        'company_id',
        'branch_id',
        'opened_at',
        'closed_at',
        'status',
        'opening_cash',
        'notes',
    ];

    protected $casts = [
        'opening_cash' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];
}

