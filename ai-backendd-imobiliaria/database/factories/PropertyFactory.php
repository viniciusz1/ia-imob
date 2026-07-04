<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Property>
 */
class PropertyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reference_code' => strtoupper(Str::random(2)).$this->faker->unique()->numberBetween(1000, 9999),
            'title' => $this->faker->sentence(4),
            'description' => $this->faker->paragraph(),
            'property_type' => $this->faker->randomElement(['apartamento', 'casa', 'terreno']),
            'purpose' => $this->faker->randomElement(['venda', 'locacao']),
            'status' => 'disponivel',

            // Location
            'zip_code' => $this->faker->postcode(),
            'state' => 'SP',
            'city' => $this->faker->city(),
            'neighborhood' => $this->faker->streetName(),
            'street' => $this->faker->streetName(),
            'number' => $this->faker->buildingNumber(),
            'latitude' => $this->faker->latitude(),
            'longitude' => $this->faker->longitude(),

            // Pricing
            'sale_price' => $this->faker->numberBetween(100000, 2000000),
            'rent_price' => $this->faker->numberBetween(1000, 5000),

            // Characteristics
            'usable_area' => $this->faker->numberBetween(30, 500),
            'bedrooms' => $this->faker->numberBetween(1, 5),
            'bathrooms' => $this->faker->numberBetween(1, 4),
            'garage_spaces' => $this->faker->numberBetween(0, 4),

            // Flags
            'is_published' => true,
            'is_highlighted' => $this->faker->boolean(),

            // Management
            'broker_id' => User::factory(),
        ];
    }
}
