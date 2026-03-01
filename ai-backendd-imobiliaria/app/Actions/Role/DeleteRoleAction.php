<?php

declare(strict_types=1);

namespace App\Actions\Role;

use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class DeleteRoleAction
{
    public function execute(Role $role): void
    {
        if (strtolower($role->name) === 'administrador') {
            throw ValidationException::withMessages([
                'role' => ['Não é possível excluir o grupo de Administrador.'],
            ]);
        }

        $role->delete();
    }
}
