<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterAgencyRequest;
use App\Http\Requests\UpdateAgencyRequest;
use App\Http\Resources\AgencyResource;
use App\Models\Agency;
use App\Models\AgencySiteSettings;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AdminAgencyController extends Controller
{
    /**
     * List all Agencies (Platform Admin only).
     * Gated by platform.agencies.view in the route definition.
     */
    public function index(): AnonymousResourceCollection
    {
        return AgencyResource::collection(
            Agency::query()->orderBy('name')->get()
        );
    }

    /**
     * Inspect a single Agency's details.
     * Gated by platform.agencies.view in the route definition.
     */
    public function show(Agency $agency): AgencyResource
    {
        return new AgencyResource($agency);
    }

    /**
     * Deactivate an Agency. Gated by platform.agencies.deactivate.
     */
    public function deactivate(Agency $agency): AgencyResource
    {
        $agency->update(['is_active' => false]);

        return new AgencyResource($agency->fresh());
    }

    /**
     * Reactivate a previously deactivated Agency. Gated by platform.agencies.deactivate.
     */
    public function activate(Agency $agency): AgencyResource
    {
        $agency->update(['is_active' => true]);

        return new AgencyResource($agency->fresh());
    }

    /**
     * Update basic Agency identity/contact fields.
     * Gated by platform.agencies.update in the route definition.
     */
    public function update(UpdateAgencyRequest $request, Agency $agency): AgencyResource
    {
        $agency->update($request->validated());

        return new AgencyResource($agency->fresh());
    }

    /**
     * Register a new Agency with its Initial Agency Admin.
     * Gated by platform.agencies.create in the route definition.
     *
     * Creates Agency, Admin User, default site settings, and assigns the
     * Administrador role in a single database transaction.
     */
    public function store(RegisterAgencyRequest $request): JsonResponse
    {
        $validated = $request->validated();

        [$agency, $admin] = DB::transaction(function () use ($validated) {
            $agency = Agency::create([
                'name' => $validated['agency']['name'],
                'slug' => $validated['agency']['slug'],
                'is_active' => true,
            ]);

            $admin = User::create([
                'agency_id' => $agency->id,
                'name' => $validated['admin']['name'],
                'email' => $validated['admin']['email'],
                'username' => $validated['admin']['username'],
                'phone' => $validated['admin']['phone'] ?? '(00) 00000-0000',
                'password' => $validated['admin']['password'],
                'person_type' => 'F',
                'is_active' => true,
            ]);

            // Assign Agency Admin role. The role must use the same guard as the User
            // model (web), even when the request is authenticated via Sanctum.
            $guard = 'web';
            $agencyAdminRole = Role::firstOrCreate([
                'name' => 'Administrador',
                'guard_name' => $guard,
            ]);
            $agencyAdminRole->syncPermissions(
                Permission::query()
                    ->where('guard_name', $guard)
                    ->where('name', 'not like', 'platform.%')
                    ->where('name', 'not like', 'crawler.%')
                    ->get()
            );
            $admin->assignRole($agencyAdminRole);

            // Create default site settings
            AgencySiteSettings::create([
                'agency_id' => $agency->id,
            ]);

            return [$agency, $admin];
        });

        return (new AgencyResource($agency))
            ->response()
            ->setStatusCode(201);
    }
}
