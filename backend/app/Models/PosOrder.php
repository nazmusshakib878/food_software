<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosOrder extends Model
{
    protected $table = 'pos_orders';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $appends = [
        'order_number',
        'creator_classification',
    ];

    protected $fillable = [
        'id',
        'client_order_id',
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
        'payment_status',
        'cancelled_at',
        'cancellation_reason',
        'subtotal',
        'tax',
        'tax_rate',
        'discount',
        'grand_total',
        'paid',
        'change',
        'method',
        'payment_breakdown',
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
        'payment_breakdown' => 'array',
        'cancelled_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PosOrderItem::class, 'order_id', 'id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function getOrderNumberAttribute(): string
    {
        if (!empty($this->raw_payload['order_number'])) {
            return (string) $this->raw_payload['order_number'];
        }
        if (!empty($this->raw_payload['orderNumber'])) {
            return (string) $this->raw_payload['orderNumber'];
        }
        if (!empty($this->client_order_id) && preg_match('/^[A-Za-z]\.\d+/i', (string) $this->client_order_id)) {
            return (string) $this->client_order_id;
        }
        if (!empty($this->id) && preg_match('/^[A-Za-z]\.\d+/i', (string) $this->id)) {
            return (string) $this->id;
        }
        if (!empty($this->seq)) {
            $user = $this->relationLoaded('user') ? $this->user : null;
            $role = $user ? $user->role : null;
            if ($role === 'staff') {
                $isStaff2 = ($user && ($user->staff_id === 'STF-1052' || str_contains($user->name ?? '', '2')));
                $prefix = $isStaff2 ? 'D.' : 'B.';
            } else {
                $prefix = 'A.';
            }
            return $prefix . $this->seq;
        }
        return (string) ($this->client_order_id ?: $this->id);
    }

    public function getCreatorClassificationAttribute(): array
    {
        $orderNum = $this->order_number;
        if (preg_match('/^([A-Za-z])\./', $orderNum, $matches)) {
            $letter = strtoupper($matches[1]);
            if ($letter === 'A') {
                return [
                    'type' => 'cashier',
                    'label' => 'CASHIER',
                    'is_cashier' => true,
                    'is_staff' => false,
                    'letter' => 'A',
                ];
            }
            if ($letter === 'B' || $letter === 'D') {
                return [
                    'type' => 'staff',
                    'label' => 'STAFF',
                    'is_cashier' => false,
                    'is_staff' => true,
                    'letter' => $letter,
                ];
            }
        }
        return [
            'type' => 'unknown',
            'label' => 'UNKNOWN',
            'is_cashier' => false,
            'is_staff' => false,
        ];
    }
}

