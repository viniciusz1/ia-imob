<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MarketSearchConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_parallel_requests_cannot_exceed_the_daily_user_limit(): void
    {
        if (! function_exists('pcntl_fork') || DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Requires process control and PostgreSQL.');
        }

        $user = User::factory()->for(Agency::factory())->create();
        $user->forceFill(['market_search_daily_limit' => 1])->save();
        $agencyId = $user->agency_id;
        DB::commit();
        DB::disconnect();
        $children = [];
        foreach (range(1, 2) as $index) {
            $sockets = stream_socket_pair(STREAM_PF_UNIX, STREAM_SOCK_STREAM, STREAM_IPPROTO_IP);
            $pid = pcntl_fork();
            if ($pid === -1) {
                self::fail('Could not start a concurrent request.');
            }
            if ($pid === 0) {
                fclose($sockets[0]);
                fread($sockets[1], 1);
                try {
                    DB::purge();
                    $status = $this->actingAs(User::findOrFail($user->id))->getJson('/api/v1/market-properties')->getStatusCode();
                    fwrite($sockets[1], (string) $status);
                } catch (\Throwable $exception) {
                    fwrite($sockets[1], 'error: '.$exception->getMessage());
                }
                fclose($sockets[1]);
                exit(0);
            }
            fclose($sockets[1]);
            $children[] = [$pid, $sockets[0]];
        }

        foreach ($children as [, $socket]) {
            fwrite($socket, 'x');
        }
        $statuses = [];
        foreach ($children as [$pid, $socket]) {
            $statuses[] = stream_get_contents($socket);
            fclose($socket);
            pcntl_waitpid($pid, $status);
        }
        DB::table('users')->where('id', $user->id)->delete();
        DB::table('agencies')->where('id', $agencyId)->delete();
        DB::beginTransaction();
        sort($statuses);
        self::assertSame(['200', '429'], $statuses);
    }
}
