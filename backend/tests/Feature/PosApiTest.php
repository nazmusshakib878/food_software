<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\PosInventoryMovement;
use App\Models\PosProduct;
use App\Models\PosOrder;
use App\Models\Branch;
use App\Models\Company;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    private function createOtherTenant(): void
    {
        Company::create(['id' => 'CMP-OTHER', 'name' => 'Other Company', 'currency' => 'SAR', 'status' => 'active']);
        Branch::create(['company_id' => 'CMP-OTHER', 'code' => 'BR-OTHER', 'name' => 'Other Branch', 'timezone' => 'Asia/Riyadh', 'status' => 'active']);
    }

    /**
     * Test 1: PIN 1050 authenticates Cashier with sidebar & reports permissions.
     */
    public function test_pin_1050_authenticates_cashier(): void
    {
        $response = $this->postJson('/api/auth/login', ['pin' => '1050']);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'session' => [
                    'user' => [
                        'staffId' => 'STF-1050',
                        'role' => 'cashier',
                        'canOpenSidebar' => true,
                    ]
                ]
            ]);

        $response->assertCookie('nurpos_session', null, false);
        $this->assertArrayNotHasKey('token', $response->json('session'));
    }

    /**
     * Test 2: PIN 1051 authenticates Staff 1 without sidebar permission.
     */
    public function test_pin_1051_authenticates_staff_1(): void
    {
        $response = $this->postJson('/api/auth/login', ['pin' => '1051']);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'session' => [
                    'user' => [
                        'staffId' => 'STF-1051',
                        'role' => 'staff',
                        'canOpenSidebar' => false,
                    ]
                ]
            ])
            ->assertCookie('nurpos_session', null, false);
    }

    /**
     * Test 3: Legacy and invalid PINs are rejected.
     */
    public function test_legacy_and_invalid_pins_are_rejected(): void
    {
        $this->postJson('/api/auth/login', ['pin' => '0000'])->assertStatus(401);
        $this->postJson('/api/auth/login', ['pin' => '1234'])->assertStatus(401);
        $this->postJson('/api/auth/login', ['pin' => '9999'])->assertStatus(401);
    }

    /**
     * Test 4: RBAC on Reports - Cashier allowed (200), Staff blocked (403).
     */
    public function test_reports_endpoint_rbac(): void
    {
        // 1. Staff is blocked
        $staffUser = User::where('staff_id', 'STF-1051')->first();
        $this->actingAs($staffUser, 'sanctum')
            ->getJson('/api/reports')
            ->assertStatus(403)
            ->assertJsonFragment(['error' => 'ACCESS DENIED: Insufficient permissions for management reports']);

        // 2. Cashier is authorized
        $cashierUser = User::where('staff_id', 'STF-1050')->first();
        $this->actingAs($cashierUser, 'sanctum')
            ->getJson('/api/reports')
            ->assertStatus(200)
            ->assertJsonFragment(['success' => true]);
    }

    /**
     * Test 5: Role-based Order Validation - Staff cannot submit partner orders.
     */
    public function test_order_submission_rbac(): void
    {
        $staffUser = User::where('staff_id', 'STF-1051')->first();
        $cashierUser = User::where('staff_id', 'STF-1050')->first();
        $baseOrder = [
            'orderId' => 'CLIENT-RBAC-1', 'orderTypeId' => 'delivery', 'paid' => 13.50, 'method' => 'Cash',
            'items' => [['id' => 'item_meat_burger', 'qty' => 1]],
        ];
        $staffShift = $this->actingAs($staffUser, 'sanctum')->postJson('/api/shifts', ['openingCash' => 20])
            ->assertCreated()->json('shift.id');
        $baseOrder['shiftId'] = $staffShift;

        // 1. Staff submitting Hungerstation is rejected with 403 Forbidden
        $this->actingAs($staffUser, 'sanctum')
            ->postJson('/api/orders', array_merge($baseOrder, ['customerId' => 'hungerstation']))
            ->assertStatus(403)
            ->assertJsonFragment(['error' => 'Staff may only submit cash customer orders.']);

        // 2. Staff submitting Cash Customer order is accepted with 201 Created
        $this->actingAs($staffUser, 'sanctum')
            ->postJson('/api/orders', array_merge($baseOrder, ['orderId' => 'CLIENT-RBAC-2', 'customerId' => 'cash']))
            ->assertStatus(201)
            ->assertJsonPath('order.grand_total', '13.50');

        // 3. Cashier submitting Hungerstation order is accepted with 201 Created
        $cashierOrder = $baseOrder;
        unset($cashierOrder['shiftId']);
        $this->actingAs($cashierUser, 'sanctum')
            ->postJson('/api/orders', array_merge($cashierOrder, ['orderId' => 'CLIENT-RBAC-3', 'customerId' => 'hungerstation', 'method' => 'Ajel']))
            ->assertStatus(201)
            ->assertJsonPath('order.grand_total', '13.50');
    }

    /**
     * Test 6: Multi-Device Simultaneous Sessions & Independent Logout.
     */
    public function test_multi_device_simultaneous_sessions(): void
    {
        // Device 1: Cashier logs in
        $resDev1 = $this->postJson('/api/auth/login', ['pin' => '1050'])->assertStatus(200);
        $token1 = $resDev1->getCookie('nurpos_session', false)->getValue();

        // Device 2: Staff 1 logs in
        $resDev2 = $this->postJson('/api/auth/login', ['pin' => '1051'])->assertStatus(200);
        $token2 = $resDev2->getCookie('nurpos_session', false)->getValue();

        // Device 3: Staff 2 logs in
        $resDev3 = $this->postJson('/api/auth/login', ['pin' => '1052'])->assertStatus(200);
        $token3 = $resDev3->getCookie('nurpos_session', false)->getValue();

        // All 3 tokens are distinct
        $this->assertNotEquals($token1, $token2);
        $this->assertNotEquals($token2, $token3);

        // Verify Device 2 session is active
        $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->getJson('/api/auth/session')
            ->assertStatus(200)
            ->assertJsonFragment(['staffId' => 'STF-1051']);

        // Device 1 logs out
        $this->flushHeaders();
        $this->withHeader('Authorization', 'Bearer ' . $token1)
            ->postJson('/api/auth/logout')
            ->assertStatus(200);

        // Device 1 token is revoked
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer ' . $token1)
            ->getJson('/api/auth/session')
            ->assertStatus(401);

        // Device 2 and Device 3 remain active
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->getJson('/api/auth/session')
            ->assertStatus(200)
            ->assertJsonFragment(['staffId' => 'STF-1051']);

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer ' . $token3)
            ->getJson('/api/auth/session')
            ->assertStatus(200)
            ->assertJsonFragment(['staffId' => 'STF-1052']);
    }

    /**
     * Test 7: Shifts Management - Active Shift & Shift Creation.
     */
    public function test_shift_management(): void
    {
        $cashierUser = User::where('staff_id', 'STF-1050')->first();

        // 1. Get active shift
        $this->actingAs($cashierUser, 'sanctum')
            ->getJson('/api/shifts/active')
            ->assertStatus(200)
            ->assertJsonFragment(['id' => 'SH-101', 'status' => 'active']);

        // 2. Prevent a duplicate active shift until the seeded one is closed.
        $this->actingAs($cashierUser, 'sanctum')->postJson('/api/shifts', [
            'openingCash' => 350.00,
            'notes' => 'Evening shift',
        ])->assertStatus(409);

        $this->actingAs($cashierUser, 'sanctum')->postJson('/api/shifts/SH-101/close')->assertOk();

        // 3. Open a new shift after closing the current shift.
        $res = $this->actingAs($cashierUser, 'sanctum')
            ->postJson('/api/shifts', [
                'openingCash' => 350.00,
                'notes' => 'Evening shift'
            ])
            ->assertStatus(201)
            ->assertJsonFragment(['success' => true]);

        $newShiftId = $res->json('shift.id');

        // 4. Close the shift
        $this->actingAs($cashierUser, 'sanctum')
            ->postJson("/api/shifts/{$newShiftId}/close")
            ->assertStatus(200)
            ->assertJsonFragment(['status' => 'closed']);
    }

    /**
     * Test 8: Canonical Customers & Delivery Partners Endpoint.
     */
    public function test_customers_endpoint(): void
    {
        $cashierUser = User::where('staff_id', 'STF-1050')->first();

        $res = $this->actingAs($cashierUser, 'sanctum')
            ->getJson('/api/customers')
            ->assertStatus(200)
            ->assertJsonFragment(['success' => true]);

        $customers = $res->json('customers');
        $this->assertCount(10, $customers);
        $ids = array_column($customers, 'id');
        $this->assertContains('cash', $ids);
        $this->assertContains('hungerstation', $ids);
        $this->assertContains('jahiz', $ids);
        $this->assertContains('ninja', $ids);
        $this->assertContains('keeta', $ids);
        $this->assertContains('mrsool', $ids);
        $this->assertContains('toyou', $ids);
        $this->assertContains('thechefz', $ids);
        $this->assertContains('management', $ids);
        $this->assertContains('mosque', $ids);
    }

    public function test_order_history_is_scoped_to_authenticated_tenant(): void
    {
        $this->createOtherTenant();
        $cashier = User::where('staff_id', 'STF-1050')->first();
        \App\Models\PosOrder::create([
            'id' => 'ORD-OWN', 'company_id' => $cashier->company_id, 'branch_id' => $cashier->branch_id,
            'grand_total' => 10, 'paid' => 10,
        ]);
        \App\Models\PosOrder::create([
            'id' => 'ORD-OTHER', 'company_id' => 'CMP-OTHER', 'branch_id' => 'BR-OTHER',
            'grand_total' => 99, 'paid' => 99,
        ]);

        $this->actingAs($cashier, 'sanctum')
            ->getJson('/api/orders')
            ->assertOk()
            ->assertJsonFragment(['id' => 'ORD-OWN'])
            ->assertJsonMissing(['id' => 'ORD-OTHER']);
    }

    public function test_shift_reads_and_close_are_scoped_to_authenticated_tenant(): void
    {
        $this->createOtherTenant();
        $cashier = User::where('staff_id', 'STF-1050')->first();
        \App\Models\PosShift::create([
            'id' => 'SH-OTHER', 'shift_number' => '999', 'cashier' => 'Other',
            'company_id' => 'CMP-OTHER', 'branch_id' => 'BR-OTHER', 'status' => 'active',
            'opening_cash' => 0, 'opened_at' => now(),
        ]);

        $this->actingAs($cashier, 'sanctum')
            ->getJson('/api/shifts/active')
            ->assertOk()
            ->assertJsonMissing(['id' => 'SH-OTHER']);

        $this->actingAs($cashier, 'sanctum')
            ->postJson('/api/shifts/SH-OTHER/close')
            ->assertNotFound();
        $this->assertDatabaseHas('pos_shifts', ['id' => 'SH-OTHER', 'status' => 'active']);
    }

    public function test_catalog_is_seeded_and_scoped_to_authenticated_branch(): void
    {
        $this->createOtherTenant();
        $cashier = User::where('staff_id', 'STF-1050')->first();
        $this->actingAs($cashier, 'sanctum')->getJson('/api/catalog/categories')
            ->assertOk()->assertJsonCount(4, 'categories');
        $this->actingAs($cashier, 'sanctum')->getJson('/api/catalog/products')
            ->assertOk()->assertJsonCount(24, 'products');

        PosProduct::create([
            'product_id' => 'other-item', 'company_id' => 'CMP-OTHER', 'branch_id' => 'BR-OTHER',
            'category_id' => 'meals', 'name_en' => 'Other Item', 'name_ar' => 'منتج',
            'price' => 1, 'tax_rate' => 15, 'available' => true, 'track_stock' => true,
            'stock_on_hand' => 9, 'low_stock_threshold' => 2,
        ]);
        $this->actingAs($cashier, 'sanctum')->getJson('/api/catalog/products')
            ->assertOk()->assertJsonMissing(['product_id' => 'other-item']);
        $this->actingAs($cashier, 'sanctum')->getJson('/api/inventory')
            ->assertOk()->assertJsonMissing(['product_id' => 'other-item']);
    }

    public function test_order_totals_use_server_prices_and_retry_is_idempotent(): void
    {
        $cashier = User::where('staff_id', 'STF-1050')->first();
        $payload = [
            'orderId' => 'client-order-test-1', 'customerId' => 'cash', 'orderTypeId' => 'delivery',
            'paid' => 30, 'method' => 'Cash', 'total' => 1, 'tax' => 0,
            'items' => [
                ['id' => 'item_meat_burger', 'qty' => 1, 'price' => 0],
                ['id' => 'item_meat_burger', 'qty' => 1, 'price' => 0],
            ],
        ];
        $response = $this->actingAs($cashier, 'sanctum')->postJson('/api/orders', $payload)
            ->assertCreated()->assertJsonPath('order.subtotal', '27.00')
            ->assertJsonPath('order.tax', '3.52')->assertJsonPath('order.grand_total', '27.00')
            ->assertJsonPath('order.change', '3.00');
        $orderId = $response->json('order.id');
        $this->assertDatabaseCount('pos_order_items', 2);
        $this->assertDatabaseHas('pos_payment_transactions', [
            'order_id' => $orderId, 'company_id' => $cashier->company_id,
            'method' => 'Cash', 'amount' => '30.00', 'status' => 'recorded_manual',
        ]);

        $this->actingAs($cashier, 'sanctum')->postJson('/api/orders', $payload)
            ->assertOk()->assertJsonPath('duplicate', true)->assertJsonPath('order.id', $orderId);
        $this->assertDatabaseCount('pos_orders', 1);
    }

    public function test_split_tender_records_each_manual_payment_part(): void
    {
        $cashier = User::where('staff_id', 'STF-1050')->first();
        $response = $this->actingAs($cashier, 'sanctum')->postJson('/api/orders', [
            'orderId' => 'client-order-split-1', 'customerId' => 'cash', 'orderTypeId' => 'delivery',
            'paid' => 27, 'method' => 'Split', 'paymentBreakdown' => ['cash' => 10, 'credit' => 17],
            'items' => [['id' => 'item_meat_burger', 'qty' => 2]],
        ])->assertCreated();
        $orderId = $response->json('order.id');
        $this->assertDatabaseCount('pos_payment_transactions', 2);
        $this->assertDatabaseHas('pos_payment_transactions', ['order_id' => $orderId, 'method' => 'Cash', 'amount' => '10.00']);
        $this->assertDatabaseHas('pos_payment_transactions', ['order_id' => $orderId, 'method' => 'Ajel', 'amount' => '17.00']);
    }

    public function test_inventory_decrements_on_sale_and_restores_once_on_cancellation(): void
    {
        $cashier = User::where('staff_id', 'STF-1050')->first();
        $cashier->permissions = array_merge($cashier->permissions ?? [], ['orders_cancel']);
        $cashier->save();
        $product = PosProduct::where('product_id', 'item_meat_burger')->firstOrFail();
        $product->track_stock = true;
        $product->stock_on_hand = 5;
        $product->save();

        $created = $this->actingAs($cashier, 'sanctum')->postJson('/api/orders', [
            'orderId' => 'client-order-stock-1', 'customerId' => 'cash', 'orderTypeId' => 'delivery',
            'paid' => 30, 'method' => 'Cash', 'items' => [['id' => $product->product_id, 'qty' => 2]],
        ])->assertCreated();
        $orderId = $created->json('order.id');
        $this->assertSame('3.000', $product->fresh()->stock_on_hand);

        $this->actingAs($cashier, 'sanctum')->postJson("/api/orders/{$orderId}/cancel", ['reason' => 'Mistaken order'])
            ->assertOk()->assertJsonPath('order.status', 'cancelled');
        $this->assertSame('5.000', $product->fresh()->stock_on_hand);
        $this->assertCount(2, PosInventoryMovement::where('order_id', $orderId)->get());

        $this->actingAs($cashier, 'sanctum')->postJson("/api/orders/{$orderId}/cancel", ['reason' => 'Repeat request'])
            ->assertOk();
        $this->assertSame('5.000', $product->fresh()->stock_on_hand);
        $this->assertCount(2, PosInventoryMovement::where('order_id', $orderId)->get());
    }

    public function test_reports_aggregate_persisted_branch_orders_only(): void
    {
        $this->createOtherTenant();
        $cashier = User::where('staff_id', 'STF-1050')->first();
        PosOrder::create([
            'id' => 'ORD-REPORT-OWN', 'company_id' => $cashier->company_id, 'branch_id' => $cashier->branch_id,
            'status' => 'completed', 'grand_total' => 20, 'tax' => 2.61, 'discount' => 0,
        ]);
        PosOrder::create([
            'id' => 'ORD-REPORT-OTHER', 'company_id' => 'CMP-OTHER', 'branch_id' => 'BR-OTHER',
            'status' => 'completed', 'grand_total' => 500, 'tax' => 65.22, 'discount' => 0,
        ]);

        $this->actingAs($cashier, 'sanctum')->getJson('/api/reports?period=day&date='.now()->format('Y-m-d'))
            ->assertOk()->assertJsonPath('summary.totalOrders', 1)
            ->assertJsonPath('summary.totalSales', 20)
            ->assertJsonPath('orders.0.id', 'ORD-REPORT-OWN');
    }

    public function test_branch_administration_is_company_scoped_and_permission_checked(): void
    {
        $cashier = User::where('staff_id', 'STF-1050')->first();
        $this->actingAs($cashier, 'sanctum')->getJson('/api/branches')
            ->assertOk()->assertJsonCount(1, 'branches')->assertJsonPath('branches.0.code', 'BR-001');
        $this->actingAs($cashier, 'sanctum')->postJson('/api/branches', ['code' => 'BR-002', 'name' => 'Second Branch'])
            ->assertForbidden();
        $cashier->permissions = array_merge($cashier->permissions ?? [], ['branches_manage']);
        $cashier->save();
        $this->actingAs($cashier, 'sanctum')->postJson('/api/branches', [
            'code' => 'BR-002', 'name' => 'Second Branch', 'timezone' => 'Asia/Riyadh',
        ])->assertCreated()->assertJsonPath('branch.company_id', 'CMP-001');
        $this->actingAs($cashier, 'sanctum')->postJson('/api/branches', [
            'code' => 'BR-002', 'name' => 'Duplicate Branch',
        ])->assertUnprocessable();
    }

    public function test_tenant_provisioning_command_creates_scoped_company_branch_and_admin(): void
    {
        $this->artisan('pos:provision-tenant')
            ->expectsQuestion('Company ID (letters, numbers, dash, underscore)', 'CMP-NEW')
            ->expectsQuestion('Company name', 'New Tenant')
            ->expectsQuestion('Initial branch code', 'BR-NEW')
            ->expectsQuestion('Initial branch name', 'Main Branch')
            ->expectsQuestion('Administrator name', 'Tenant Admin')
            ->expectsQuestion('Administrator email', 'admin@example.test')
            ->expectsQuestion('Administrator 4-digit POS PIN', '6789')
            ->assertExitCode(0);

        $admin = User::where('email', 'admin@example.test')->firstOrFail();
        $this->assertSame('CMP-NEW', $admin->company_id);
        $this->assertSame('BR-NEW', $admin->branch_id);
        $this->assertNotSame('6789', $admin->pin_hash);
        $this->assertDatabaseHas('branches', ['company_id' => 'CMP-NEW', 'code' => 'BR-NEW']);
    }

    public function test_catalog_write_permissions_and_branch_validation(): void
    {
        $cashier = User::where('staff_id', 'STF-1050')->first();
        $payload = ['categoryId' => 'new-cat', 'nameEn' => 'New Category', 'nameAr' => 'Ù‚Ø³Ù…', 'sortOrder' => 10];
        $this->actingAs($cashier, 'sanctum')->postJson('/api/catalog/categories', $payload)->assertForbidden();

        $cashier->permissions = array_merge($cashier->permissions ?? [], ['catalog_manage']);
        $cashier->save();
        $this->actingAs($cashier, 'sanctum')->postJson('/api/catalog/categories', $payload)
            ->assertCreated()->assertJsonPath('category.category_id', 'new-cat');
        $this->actingAs($cashier, 'sanctum')->postJson('/api/catalog/products', [
            'productId' => 'new-product', 'categoryId' => 'outside-branch', 'nameEn' => 'Item', 'nameAr' => 'ØµÙ†Ù',
            'price' => 5, 'taxRate' => 15,
        ])->assertNotFound();
    }

    public function test_designated_cashier_can_close_another_users_branch_shift(): void
    {
        $cashier = User::where('staff_id', 'STF-1050')->first();
        $otherCashier = User::where('staff_id', 'STF-1052')->first();
        \App\Models\PosShift::create([
            'id' => 'SH-OWNED-BY-OTHER', 'shift_number' => '998', 'cashier' => 'Other Cashier',
            'user_id' => (string)$otherCashier->id, 'company_id' => $cashier->company_id,
            'branch_id' => $cashier->branch_id, 'status' => 'active', 'opening_cash' => 50, 'opened_at' => now(),
        ]);
        $this->actingAs($cashier, 'sanctum')->postJson('/api/shifts/SH-OWNED-BY-OTHER/close')
            ->assertOk()->assertJsonPath('shift.status', 'closed');
        $this->assertDatabaseHas('pos_shifts', ['id' => 'SH-OWNED-BY-OTHER', 'status' => 'closed']);
    }

    public function test_designated_staff_share_branch_shifts_without_sharing_order_entry(): void
    {
        $staff = User::where('staff_id', 'STF-1051')->first();
        $otherStaff = User::where('staff_id', 'STF-1052')->first();
        $opened = $this->actingAs($staff, 'sanctum')->postJson('/api/shifts', ['openingCash' => 20]);
        $opened->assertCreated()->assertJsonPath('shift.user_id', (string) $staff->id);
        $shiftId = $opened->json('shift.id');

        $this->actingAs($staff, 'sanctum')->getJson('/api/shifts')
            ->assertOk()->assertJsonFragment(['id' => $shiftId])->assertJsonFragment(['id' => 'SH-101']);
        $this->actingAs($staff, 'sanctum')->postJson('/api/shifts', ['openingCash' => 25])->assertStatus(409);
        $this->actingAs($otherStaff, 'sanctum')->getJson('/api/shifts')
            ->assertOk()->assertJsonFragment(['id' => $shiftId])->assertJsonFragment(['id' => 'SH-101']);
        $this->actingAs($otherStaff, 'sanctum')->getJson("/api/shifts/{$shiftId}/report")->assertOk();

        $this->actingAs($staff, 'sanctum')->postJson('/api/orders', [
            'orderId' => 'STAFF-SHIFT-INVOICE', 'shiftId' => $shiftId, 'customerId' => 'cash',
            'orderTypeId' => 'delivery', 'paid' => 13.50, 'method' => 'Cash',
            'items' => [['id' => 'item_meat_burger', 'qty' => 1]],
        ])->assertCreated();
        $this->actingAs($staff, 'sanctum')->getJson("/api/shifts/{$shiftId}/invoices")
            ->assertOk()->assertJsonCount(1, 'orders')->assertJsonPath('orders.0.shift_id', $shiftId);
        $this->actingAs($otherStaff, 'sanctum')->getJson("/api/shifts/{$shiftId}/invoices")
            ->assertOk()->assertJsonCount(1, 'orders');
        $this->actingAs($otherStaff, 'sanctum')->postJson("/api/shifts/{$shiftId}/close")
            ->assertOk()->assertJsonPath('shift.status', 'closed');

        $this->assertDatabaseHas('pos_orders', ['client_order_id' => 'STAFF-SHIFT-INVOICE', 'shift_id' => $shiftId, 'user_id' => (string) $staff->id]);
        $this->assertNotNull(\App\Models\PosShift::find($shiftId)->closed_at);
        $this->actingAs($staff, 'sanctum')->getJson("/api/shifts/{$shiftId}/report")
            ->assertOk()->assertJsonPath('shift.status', 'closed')->assertJsonPath('summary.orderCount', 1)
            ->assertJsonPath('summary.grandTotal', 13.5);

        $unprivilegedStaff = $staff->replicate();
        $unprivilegedStaff->staff_id = 'STF-1053';
        $unprivilegedStaff->email = 'staff3@nurfoodes.com';
        $unprivilegedStaff->permissions = ['pos_login', 'pos_orders', 'staff_shifts'];
        $unprivilegedStaff->save();
        $this->actingAs($unprivilegedStaff, 'sanctum')->getJson('/api/shifts')
            ->assertOk()->assertJsonCount(0, 'shifts');
        $this->actingAs($unprivilegedStaff, 'sanctum')->postJson('/api/shifts/close-branch')->assertForbidden();

        $this->actingAs($staff, 'sanctum')->patchJson('/api/orders/ORD-ANY/status', ['status' => 'served'])->assertForbidden();
    }

    public function test_designated_staff_can_close_all_active_shifts_in_their_branch_only(): void
    {
        $this->createOtherTenant();
        $cashier = User::where('staff_id', 'STF-1050')->firstOrFail();
        $staff = User::where('staff_id', 'STF-1051')->firstOrFail();
        $otherStaff = User::where('staff_id', 'STF-1052')->firstOrFail();
        \App\Models\PosShift::create([
            'id' => 'SH-OTHER-BRANCH', 'shift_number' => '997', 'cashier' => 'Other Branch',
            'user_id' => (string) $otherStaff->id, 'company_id' => 'CMP-OTHER', 'branch_id' => 'BR-OTHER',
            'status' => 'active', 'opening_cash' => 10, 'opened_at' => now(),
        ]);
        foreach ([['SH-CASHIER', $cashier], ['SH-STAFF-2', $otherStaff], ['SH-STAFF-1', $staff]] as [$id, $owner]) {
            \App\Models\PosShift::create([
                'id' => $id, 'shift_number' => $id, 'cashier' => $owner->name,
                'user_id' => (string) $owner->id, 'company_id' => $owner->company_id, 'branch_id' => $owner->branch_id,
                'status' => 'active', 'opening_cash' => 10, 'opened_at' => now(),
            ]);
        }

        $this->actingAs($staff, 'sanctum')->postJson('/api/shifts/close-branch')
            ->assertOk()->assertJsonPath('success', true)->assertJsonPath('closedCount', 4);
        foreach (['SH-101', 'SH-CASHIER', 'SH-STAFF-1', 'SH-STAFF-2'] as $id) {
            $this->assertDatabaseHas('pos_shifts', ['id' => $id, 'status' => 'closed']);
        }
        $this->assertDatabaseHas('pos_shifts', ['id' => 'SH-OTHER-BRANCH', 'status' => 'active']);
    }
}

