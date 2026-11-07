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
     * Resolve the appropriate prefix for a given user:
     * - Cashier / Admin -> 'A'
     * - Staff 1 (STF-1051) -> 'B'
     * - Staff 2 (STF-1052) -> 'D'
     */
    public static function resolvePrefixForUser($user): string
    {
        if (is_object($user)) {
            $role = strtolower(trim((string)($user->role ?? '')));
            if ($role === 'staff') {
                $staffId = (string)($user->staff_id ?? '');
                $name = (string)($user->name ?? '');
                $isStaff2 = ($staffId === 'STF-1052' || str_contains($name, '2') || str_contains($staffId, '2'));
                return $isStaff2 ? 'D' : 'B';
            }
            return 'A';
        }
        if (is_array($user)) {
            $role = strtolower(trim((string)($user['role'] ?? '')));
            if ($role === 'staff') {
                $staffId = (string)($user['staff_id'] ?? $user['staffId'] ?? '');
                $name = (string)($user['name'] ?? '');
                $isStaff2 = ($staffId === 'STF-1052' || str_contains($name, '2') || str_contains($staffId, '2'));
                return $isStaff2 ? 'D' : 'B';
            }
            return 'A';
        }
        $role = strtolower(trim((string)$user));
        return ($role === 'staff') ? 'B' : 'A';
    }

    /**
     * Authoritatively generate the next sequential order number for the given tenant & user.
     * Cashier -> prefix 'A' (e.g. A.101, A.102, A.183)
     * Staff 1 -> prefix 'B' (e.g. B.101, B.102, B.182)
     * Staff 2 -> prefix 'D' (e.g. D.101, D.102, D.197)
     *
     * Sequences for A, B, and D are kept completely separate and never merged.
     * Uses row locking (lockForUpdate) inside a database transaction to prevent race conditions.
     */
    public static function generateNextOrderNumber(string $companyId, string $branchId, $user): string
    {
        $prefix = self::resolvePrefixForUser($user);

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

