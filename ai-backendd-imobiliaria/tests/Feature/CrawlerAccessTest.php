<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrawlerAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_platform_admin_can_open_crawler_overview(): void
    {
        $this->seed();
        $platformAdmin = User::query()
            ->where('email', 'platform@imobiliaria.com')
            ->firstOrFail();

        $this->actingAs($platformAdmin)
            ->getJson('/api/v1/admin/crawler/overview')
            ->assertOk()
            ->assertJsonPath('data.module', 'crawler-operations');
    }

    public function test_agency_user_is_denied_even_when_given_crawler_view_directly(): void
    {
        $this->seed();
        $agencyUser = User::query()->whereNotNull('agency_id')->firstOrFail();
        $agencyUser->givePermissionTo('crawler.view');

        $this->actingAs($agencyUser)
            ->getJson('/api/v1/admin/crawler/overview')
            ->assertForbidden();
    }
}
