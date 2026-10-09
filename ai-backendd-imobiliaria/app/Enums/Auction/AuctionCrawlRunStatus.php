<?php

declare(strict_types=1);

namespace App\Enums\Auction;

enum AuctionCrawlRunStatus: string
{
    case Queued = 'queued';
    case Running = 'running';
    case Succeeded = 'succeeded';
    case Failed = 'failed';
    case Cancelled = 'cancelled';

    public function isActive(): bool
    {
        return $this === self::Queued || $this === self::Running;
    }

    /** @return list<string> */
    public static function activeValues(): array
    {
        return [self::Queued->value, self::Running->value];
    }

    public function label(): string
    {
        return match ($this) {
            self::Queued => 'Na fila',
            self::Running => 'Executando',
            self::Succeeded => 'Concluído',
            self::Failed => 'Falhou',
            self::Cancelled => 'Cancelado',
        };
    }
}
