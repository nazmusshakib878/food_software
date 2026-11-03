<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_requires_a_database_connection(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertExactJson(['status' => 'ok']);
    }

    public function test_production_health_endpoint_requires_mysql_driver(): void
    {
        $this->app['env'] = 'production';
        config(['app.env' => 'production', 'database.default' => 'sqlite']);

        $this->getJson('/api/health')
            ->assertServiceUnavailable()
            ->assertExactJson(['status' => 'unavailable']);
    }

}
