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
}

