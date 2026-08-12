<?php

namespace App\Exceptions;

use RuntimeException;

class MarketSearchAllowanceExceeded extends RuntimeException
{
    public function __construct(public readonly array $allowance)
    {
        parent::__construct('Limite excedido. Entre em contato com a equipe técnica.');
    }
}
