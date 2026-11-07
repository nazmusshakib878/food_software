<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class PosOrderCounter extends Model
{
    protected $table = 'pos_order_counters';

    protected $fillable = [
        'company_id',
        'branch_id',
        'prefix',
        'last_seq',
    ];

    protected $casts = [
        'last_seq' => 'integer',
    ];

    /**
     * Authoritatively generate the next sequential order number for the given tenant & role.
     * Cashier -> prefix 'A' (e.g. A.101, A.102, A.183)
     * Staff   -> prefix 'B' (e.g. B.101, B.102, B.182)
     *
     * Uses row locking (lockForUpdate) inside a database transaction to prevent race conditions.
     */
    public static function generateNextOrderNumber(string $companyId, string $branchId, string $role): string
    {
        $prefix = (strtolower(trim($role)) === 'staff') ? 'B' : 'A';

        $counter = self::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('prefix', $prefix)
            ->lockForUpdate()
            ->first();

        $maxInDb = self::findMaxExistingSequence($companyId, $branchId, $prefix);

        if ($counter) {
            $nextSeq = max($counter->last_seq, $maxInDb) + 1;
            $counter->last_seq = $nextSeq;
            $counter->save();
        } else {
            $nextSeq = ($maxInDb >= 101) ? ($maxInDb + 1) : 101;
            $counter = self::create([
                'company_id' => $companyId,
                'branch_id' => $branchId,
                'prefix' => $prefix,
                'last_seq' => $nextSeq,
            ]);
        }

        return $prefix . '.' . $nextSeq;
    }

    /**
     * Scan existing database records for this tenant and prefix to locate highest historical sequence.
     */
    public static function findMaxExistingSequence(string $companyId, string $branchId, string $prefix): int
    {
        $prefixUpper = strtoupper($prefix);
        $maxSeq = 0;

        $orders = PosOrder::where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where(function ($q) use ($prefixUpper) {
                $q->where('order_number', 'LIKE', $prefixUpper . '.%')
                  ->orWhere('order_number', 'LIKE', strtolower($prefixUpper) . '.%')
                  ->orWhere('client_order_id', 'LIKE', $prefixUpper . '.%')
                  ->orWhere('client_order_id', 'LIKE', strtolower($prefixUpper) . '.%')
                  ->orWhere('id', 'LIKE', $prefixUpper . '.%')
                  ->orWhere('id', 'LIKE', strtolower($prefixUpper) . '.%')
                  ->orWhere('raw_payload', 'LIKE', '%"' . $prefixUpper . '.%')
                  ->orWhere('raw_payload', 'LIKE', '%"' . strtolower($prefixUpper) . '.%');
            })
            ->get(['id', 'client_order_id', 'order_number', 'raw_payload']);

        $pattern = '/^' . preg_quote($prefixUpper, '/') . '\.(\d+)/i';

        foreach ($orders as $order) {
            $candidates = [
                $order->order_number,
                $order->client_order_id,
                $order->id,
                $order->raw_payload['order_number'] ?? null,
                $order->raw_payload['orderNumber'] ?? null,
            ];

            foreach ($candidates as $cand) {
                if ($cand && preg_match($pattern, (string) $cand, $matches)) {
                    $val = (int) $matches[1];
                    if ($val > $maxSeq) {
                        $maxSeq = $val;
                    }
                }
            }
        }

        return $maxSeq;
    }
}
