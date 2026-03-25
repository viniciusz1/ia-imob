<?php

namespace App\Enums;

enum SubscriptionStatus: string
{
    case Pending   = 'pending';
    case Active    = 'active';
    case Inactive  = 'inactive';
    case Expired   = 'expired';
    case Cancelled = 'cancelled';
}
