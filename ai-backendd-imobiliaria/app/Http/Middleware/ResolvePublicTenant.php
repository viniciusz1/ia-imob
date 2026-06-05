<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the Tenant for a public (White-Label Site) request from the request
 * host and binds it as the current Tenant so the global TenantScope applies.
 *
 * v1: the leftmost host label is the Tenant slug ({slug}.platform-domain).
 * Custom-domain lookup (tenant_domains) and subscription gating are layered on
 * by the host-resolution slice (#15). An unresolved host is a 404.
 */
class ResolvePublicTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        // The public Next.js app fetches server-side and forwards the visitor's
        // host as X-Tenant-Host (the backend can't see the tenant subdomain
        // otherwise). Falls back to the real host for direct requests/tests.
        $host = $request->headers->get('X-Tenant-Host') ?: $request->getHost();

        // Custom domain first (tenant_domains), then subdomain slug.
        $tenant = Tenant::whereHas('domains', fn ($q) => $q->where('hostname', $host))->first()
            ?? Tenant::where('slug', explode('.', $host)[0])->first();

        abort_if($tenant === null, 404);

        // Subscription gating (ADR-0004): lapsed -> 503 (recoverable, keeps SEO),
        // cancelled -> 404 (gone); live and preview are served.
        $state = $tenant->publicSiteState();
        abort_if($state === 'lapsed', 503);
        abort_if($state === 'gone', 404);

        app()->instance('currentTenantId', (int) $tenant->id);
        $request->attributes->set('tenant', $tenant);

        return $next($request);
    }
}
