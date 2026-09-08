<?php

namespace App\Repositories\Analytics;

final class Grouping
{
    /**
     * @param  list<scalar>  $bindings
     */
    public function __construct(
        public readonly string $expression,
        public readonly array $bindings = [],
        public readonly bool $nullable = true,
    ) {}
}
