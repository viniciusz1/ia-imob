<?php

namespace App\Domain\MarketInsights;

enum ConcentrationLevel: string
{
    case Above = 'above';
    case Below = 'below';
    case Neutral = 'neutral';
    case InsufficientSample = 'insufficient_sample';
}
