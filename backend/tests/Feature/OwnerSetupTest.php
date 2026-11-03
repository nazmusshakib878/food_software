<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class OwnerSetupTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'test-only-owner-bootstrap-token-keep-out-of-production';

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.owner_setup_token' => self::TOKEN]);
        RateLimiter::clear('owner_setup:'.hash('sha256', '127.0.0.1'));
        Company::firstOrCreate(['id' => 'CMP-001'], ['name' => 'Existing Company', 'currency' => 'SAR', 'status' => 'active']);
        Branch::firstOrCreate(['company_id' => 'CMP-001', 'code' => 'BR-001'], ['name' => 'Existing Branch', 'timezone' => 'Asia/Riyadh', 'status' => 'active']);
    }

    public function test_setup_status_only_exposes_existing_tenant_while_token_is_configured_and_users_are_empty(): void
    {
        $this->getJson('/api/setup/status')->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonPath('companies.0.id', 'CMP-001')
            ->assertJsonPath('companies.0.branches.0.code', 'BR-001');

        config(['app.owner_setup_token' => null]);
        $this->getJson('/api/setup/status')->assertNotFound()->assertJsonPath('available', false);
    }

    public function test_first_owner_is_created_for_existing_company_and_branch_with_compatible_pin_hash(): void
    {
        $this->withHeader('X-Owner-Setup-Token', self::TOKEN)->postJson('/api/setup/owner', [
            'name' => 'Authorized Owner', 'email' => 'owner@example.test', 'staff_id' => 'OWNER-01',
            'company_id' => 'CMP-001', 'branch_id' => 'BR-001', 'pin' => '6842', 'pin_confirmation' => '6842',
        ])->assertCreated()->assertJsonPath('created', true)->assertJsonPath('staffId', 'OWNER-01');

        $owner = User::where('staff_id', 'OWNER-01')->firstOrFail();
        $this->assertSame('admin', $owner->role);
        $this->assertSame('CMP-001', $owner->company_id);
        $this->assertSame('BR-001', $owner->branch_id);
        $this->assertSame(128, strlen($owner->pin_hash));
        $this->assertTrue(hash_equals($owner->pin_hash, hash_pbkdf2('sha256', '6842', $owner->salt, 100000, 128, false)));
        $this->assertDatabaseCount('companies', 1);
        $this->assertDatabaseCount('branches', 1);
        $this->postJson('/api/auth/login', ['pin' => '6842'])->assertOk()
            ->assertJsonPath('session.user.staffId', 'OWNER-01')
            ->assertJsonPath('session.user.role', 'admin');

        $this->withHeader('X-Owner-Setup-Token', self::TOKEN)->postJson('/api/setup/owner', [])->assertNotFound();
        $this->getJson('/api/setup/status')->assertNotFound()->assertJsonPath('available', false);
    }

    public function test_missing_or_wrong_token_and_disclosed_pin_do_not_create_a_user(): void
    {
        $payload = [
            'name' => 'Authorized Owner', 'email' => 'owner@example.test', 'staff_id' => 'OWNER-01',
            'company_id' => 'CMP-001', 'branch_id' => 'BR-001', 'pin' => '1050', 'pin_confirmation' => '1050',
        ];

        $this->postJson('/api/setup/owner', $payload)->assertNotFound();
        $this->withHeader('X-Owner-Setup-Token', 'wrong-token-value-wrong-token-value-wrong-token-value')
            ->postJson('/api/setup/owner', $payload)->assertNotFound();
        $this->withHeader('X-Owner-Setup-Token', self::TOKEN)->postJson('/api/setup/owner', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('companies', 1);
        $this->assertDatabaseCount('branches', 1);
    }

    public function test_setup_rejects_a_branch_outside_the_selected_company(): void
    {
        $this->withHeader('X-Owner-Setup-Token', self::TOKEN)->postJson('/api/setup/owner', [
            'name' => 'Authorized Owner', 'email' => 'owner@example.test', 'staff_id' => 'OWNER-01',
            'company_id' => 'CMP-001', 'branch_id' => 'OTHER-BR', 'pin' => '6842', 'pin_confirmation' => '6842',
        ])->assertUnprocessable();

        $this->assertDatabaseCount('users', 0);
    }
}
