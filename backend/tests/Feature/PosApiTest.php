<?php

namespace Tests\Feature;

use App\Models\User;
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

        $this->assertNotEmpty($response->json('session.token'));
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
            ]);
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

        // 1. Staff submitting Hungerstation is rejected with 403 Forbidden
        $this->actingAs($staffUser, 'sanctum')
            ->postJson('/api/orders', [
                'customerId' => 'hungerstation',
                'orderTypeId' => 'delivery',
                'total' => 35.00
            ])
            ->assertStatus(403)
            ->assertJsonFragment(['error' => 'ACCESS DENIED: Staff role cannot submit Delivery Partner orders. Cash Customer only.']);

        // 2. Staff submitting Cash Customer order is accepted with 201 Created
        $this->actingAs($staffUser, 'sanctum')
            ->postJson('/api/orders', [
                'customerId' => 'cash',
                'orderTypeId' => 'delivery',
                'total' => 25.00
            ])
            ->assertStatus(201)
            ->assertJsonFragment(['success' => true]);

        // 3. Cashier submitting Hungerstation order is accepted with 201 Created
        $this->actingAs($cashierUser, 'sanctum')
            ->postJson('/api/orders', [
                'customerId' => 'hungerstation',
                'orderTypeId' => 'delivery',
                'total' => 48.00
            ])
            ->assertStatus(201)
            ->assertJsonFragment(['success' => true]);
    }

    /**
     * Test 6: Multi-Device Simultaneous Sessions & Independent Logout.
     */
    public function test_multi_device_simultaneous_sessions(): void
    {
        // Device 1: Cashier logs in
        $resDev1 = $this->postJson('/api/auth/login', ['pin' => '1050'])->assertStatus(200);
        $token1 = $resDev1->json('session.token');

        // Device 2: Staff 1 logs in
        $resDev2 = $this->postJson('/api/auth/login', ['pin' => '1051'])->assertStatus(200);
        $token2 = $resDev2->json('session.token');

        // Device 3: Staff 2 logs in
        $resDev3 = $this->postJson('/api/auth/login', ['pin' => '1052'])->assertStatus(200);
        $token3 = $resDev3->json('session.token');

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

        // 2. Open new shift
        $res = $this->actingAs($cashierUser, 'sanctum')
            ->postJson('/api/shifts', [
                'openingCash' => 350.00,
                'notes' => 'Evening shift'
            ])
            ->assertStatus(201)
            ->assertJsonFragment(['success' => true]);

        $newShiftId = $res->json('shift.id');

        // 3. Close the shift
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
}

