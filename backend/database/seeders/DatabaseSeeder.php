<?php

namespace Database\Seeders;

use App\Models\PosCustomer;
use App\Models\PosShift;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Authorized POS Staff Accounts
        $users = [
            [
                'name' => 'Cashier',
                'name_en' => 'Cashier',
                'name_ar' => 'كاشير',
                'email' => 'cashier@nurfoodes.com',
                'password' => Hash::make('1050'),
                'staff_id' => 'STF-1050',
                'role' => 'cashier',
                'salt' => '9f6c0d8b5a3241e7a68f0b1c4e2d8a5f',
                'pin_hash' => 'c5f201b3ea8b03f3d39cfd313e00b8cbcf046686db255cbabf0c813de506b01aa266f91575eb166e5acd047aa52cdd38d915117bf2d62488f7d82802c6b1c263',
                'company_id' => 'CMP-001',
                'branch_id' => 'BR-001',
                'can_open_sidebar' => true,
                'permissions' => ['pos_login', 'pos_orders', 'open_sidebar', 'invoice_reports', 'items_report', 'daily_shifts', 'reports', 'shifts'],
            ],
            [
                'name' => 'Staff 1',
                'name_en' => 'Staff 1',
                'name_ar' => 'موظف 1',
                'email' => 'staff1@nurfoodes.com',
                'password' => Hash::make('1051'),
                'staff_id' => 'STF-1051',
                'role' => 'staff',
                'salt' => '3d8b1c4e2a5f7e9a0b6c2d4e8f1a3b5c',
                'pin_hash' => '601ee8fb6cc8a20889f08484ab74da19e4e9a058630745b62157ed095777b47039e183c32cfbbee83a42c74be60b3a82f82070b17f8547e404d4f2c2492d66d9',
                'company_id' => 'CMP-001',
                'branch_id' => 'BR-001',
                'can_open_sidebar' => false,
                'permissions' => ['pos_login', 'pos_orders'],
            ],
            [
                'name' => 'Staff 2',
                'name_en' => 'Staff 2',
                'name_ar' => 'موظف 2',
                'email' => 'staff2@nurfoodes.com',
                'password' => Hash::make('1052'),
                'staff_id' => 'STF-1052',
                'role' => 'staff',
                'salt' => '7a5b3c1d9e2f4a6b8c0d1e3f5a7b9c2d',
                'pin_hash' => '98b7f7516860a65aa77a234728400062669e39e7e2d67331beda05dae27bc316828a55628cd876708efbb2b2294ce0ea80ff5577e720d49fc1b4839cde190893',
                'company_id' => 'CMP-001',
                'branch_id' => 'BR-001',
                'can_open_sidebar' => false,
                'permissions' => ['pos_login', 'pos_orders'],
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(['staff_id' => $userData['staff_id']], $userData);
        }

        // 2. Seed Canonical Customer & Delivery Partners (Exact 10 in required order)
        $customers = [
            ['id' => 'cash', 'name_en' => 'Cash Customer', 'name_ar' => 'عميل نقدي', 'is_partner' => false, 'order_type_id' => 'delivery', 'display_en' => 'Delivery', 'display_ar' => 'توصيل', 'policy' => 'NORMAL'],
            ['id' => 'hungerstation', 'name_en' => 'Hungerstation', 'name_ar' => 'شركة هنجر', 'is_partner' => true, 'order_type_id' => 'delivery', 'display_en' => 'Hungerstation', 'display_ar' => 'Hungerstation', 'policy' => 'ONLINE_PARTNER'],
            ['id' => 'jahiz', 'name_en' => 'jahiz', 'name_ar' => 'شركة جاهز الدولية', 'is_partner' => true, 'order_type_id' => 'delivery', 'display_en' => 'Jahez Delivery', 'display_ar' => 'Jahez Delivery', 'policy' => 'ONLINE_PARTNER'],
            ['id' => 'ninja', 'name_en' => 'ninja', 'name_ar' => 'شركة الخيال / نينجا', 'is_partner' => true, 'order_type_id' => 'delivery', 'display_en' => 'Ninja Delivery', 'display_ar' => 'Ninja Delivery', 'policy' => 'ONLINE_PARTNER'],
            ['id' => 'keeta', 'name_en' => 'keeta', 'name_ar' => 'تطبيق كيتا', 'is_partner' => true, 'order_type_id' => 'delivery', 'display_en' => 'keeta Delivery', 'display_ar' => 'keeta Delivery', 'policy' => 'ONLINE_PARTNER'],
            ['id' => 'mrsool', 'name_en' => 'Mrsool', 'name_ar' => 'مرسول - شركة تطبيق', 'is_partner' => true, 'order_type_id' => 'delivery', 'display_en' => 'Mrsool', 'display_ar' => 'مرسول', 'policy' => 'ONLINE_PARTNER'],
            ['id' => 'toyou', 'name_en' => 'ToYou', 'name_ar' => 'ToYou - شركة تطبيق تويو', 'is_partner' => true, 'order_type_id' => 'delivery', 'display_en' => 'سفري تويو ToYou', 'display_ar' => 'سفري تويو ToYou', 'policy' => 'ONLINE_PARTNER'],
            ['id' => 'thechefz', 'name_en' => 'The chefz', 'name_ar' => 'The chefz - تطبيق ذا شفز', 'is_partner' => true, 'order_type_id' => 'delivery', 'display_en' => 'سفري ذا شفز The chefz', 'display_ar' => 'سفري ذا شفز The chefz', 'policy' => 'ONLINE_PARTNER'],
            ['id' => 'management', 'name_en' => 'Management Staff', 'name_ar' => 'Management Staff', 'is_partner' => true, 'order_type_id' => 'delivery', 'display_en' => 'Management Staff', 'display_ar' => 'Management Staff', 'policy' => 'STAFF_EXPENSE'],
            ['id' => 'mosque', 'name_en' => 'عميل مسجد', 'name_ar' => 'عميل مسجد', 'is_partner' => false, 'order_type_id' => 'delivery', 'display_en' => 'Delivery', 'display_ar' => 'توصيل', 'policy' => 'NORMAL'],
        ];

        foreach ($customers as $cust) {
            PosCustomer::updateOrCreate(['id' => $cust['id']], $cust);
        }

        // 3. Seed Initial Active Shift
        PosShift::updateOrCreate(
            ['id' => 'SH-101'],
            [
                'shift_number' => '101',
                'cashier' => 'Cashier',
                'cashier_en' => 'Cashier',
                'cashier_ar' => 'كاشير',
                'user_id' => 'usr_cashier',
                'staff_id' => 'STF-1050',
                'company_id' => 'CMP-001',
                'branch_id' => 'BR-001',
                'opened_at' => now(),
                'status' => 'active',
                'opening_cash' => 200.00,
                'notes' => 'Initial seeded morning shift',
            ]
        );
    }
}
