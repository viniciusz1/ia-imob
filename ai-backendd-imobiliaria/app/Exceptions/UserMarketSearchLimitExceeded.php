<?php

namespace App\Exceptions;

use RuntimeException;

class UserMarketSearchLimitExceeded extends RuntimeException
{
    public function __construct(public readonly array $allowance)
    {
        parent::__construct('Limite diário de buscas atingido.');
    }
}
