<?php

namespace Tests\Unit\Ai;

use App\Services\Ai\PromptFilterSchema;
use App\Services\Crawler\PropertyTypeCatalog;
use PHPUnit\Framework\TestCase;

class PromptFilterSchemaTest extends TestCase
{
    public function test_property_type_enum_uses_the_shared_catalog(): void
    {
        $catalogNames = array_column(PropertyTypeCatalog::entries(), 'name');

        $this->assertSame($catalogNames, PromptFilterSchema::validTypes());
        $this->assertSame(
            $catalogNames,
            PromptFilterSchema::definition()['properties']['tipo']['items']['enum'],
        );
    }
}
