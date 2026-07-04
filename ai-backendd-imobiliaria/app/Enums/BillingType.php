<?php

namespace App\Enums;

enum BillingType: string
{
    case Boleto = 'BOLETO';
    case CreditCard = 'CREDIT_CARD';
    case Pix = 'PIX';
}
