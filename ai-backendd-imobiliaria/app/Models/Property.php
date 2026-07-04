<?php

namespace App\Models;

use App\Models\Concerns\BelongsToAgency;
use App\Models\Concerns\GeneratesPropertySlug;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Property extends Model
{
    use BelongsToAgency, GeneratesPropertySlug, HasFactory, SoftDeletes;

    protected $fillable = [
        'agency_id',
        'slug',
        'reference_code',
        'title',
        'description',
        'property_type',
        'purpose',
        'status',
        'zip_code',
        'state',
        'city',
        'neighborhood',
        'street',
        'number',
        'complement',
        'latitude',
        'longitude',
        'show_exact_address',
        'sale_price',
        'rent_price',
        'property_tax',
        'condo_fee',
        'accepts_financing',
        'accepts_exchange',
        'show_price',
        'usable_area',
        'total_area',
        'bedrooms',
        'suites',
        'bathrooms',
        'garage_spaces',
        'floor_number',
        'total_floors',
        'build_year',
        'video_url',
        'virtual_tour_url',
        'owner_id',
        'broker_id',
        'internal_notes',
        'has_exclusive_right',
        'exclusive_right_expiration_date',
        'keys_location',
        'is_published',
        'is_highlighted',
    ];

    protected $casts = [
        'show_exact_address' => 'boolean',
        'accepts_financing' => 'boolean',
        'accepts_exchange' => 'boolean',
        'show_price' => 'boolean',
        'has_exclusive_right' => 'boolean',
        'is_published' => 'boolean',
        'is_highlighted' => 'boolean',
        'sale_price' => 'decimal:2',
        'rent_price' => 'decimal:2',
        'property_tax' => 'decimal:2',
        'condo_fee' => 'decimal:2',
        'usable_area' => 'decimal:2',
        'total_area' => 'decimal:2',
        'exclusive_right_expiration_date' => 'date',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function images()
    {
        return $this->hasMany(PropertyImage::class)->orderBy('order');
    }

    public function features()
    {
        return $this->belongsToMany(Feature::class, 'property_feature');
    }

    public function broker()
    {
        return $this->belongsTo(User::class, 'broker_id');
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
