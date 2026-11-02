<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosPaymentTransaction extends Model
{
    protected $table = 'pos_payment_transactions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'order_id', 'company_id', 'branch_id', 'method', 'amount', 'status',
        'provider', 'provider_reference', 'recorded_by',
    ];

    protected $casts = ['amount' => 'decimal:2'];
}
