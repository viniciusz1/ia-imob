<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crawler.discovery_strategies', function (Blueprint $table) {
            $table->id();
            $table->string('key', 80)->unique();
            $table->string('label', 160);
            $table->string('kind')->default('native');
            $table->string('safety_status')->default('safe');
            $table->boolean('active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE crawler.discovery_strategies ADD CONSTRAINT discovery_strategy_kind_check CHECK (kind IN ('native', 'custom'))");
        DB::statement("ALTER TABLE crawler.discovery_strategies ADD CONSTRAINT discovery_strategy_safety_check CHECK (safety_status IN ('safe', 'blocked'))");
        DB::statement('ALTER TABLE crawler.discovery_strategies ADD CONSTRAINT discovery_strategy_creator_fk FOREIGN KEY (created_by) REFERENCES users(id)');

        foreach ([
            'sitemap' => 'Sitemap',
            'robots' => 'Robots.txt',
            'feed' => 'Feeds',
            'homepage' => 'Homepage',
            'probe' => 'Caminhos conhecidos',
            'cc' => 'Common Crawl',
            'wayback' => 'Wayback Machine',
            'crt' => 'Certificados e subdomínios',
        ] as $key => $label) {
            DB::table('crawler.discovery_strategies')->insert([
                'key' => $key,
                'label' => $label,
                'kind' => 'native',
                'safety_status' => 'safe',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::table('crawler.discovery_policy_versions', function (Blueprint $table) {
            $table->uuid('policy_key')->nullable();
        });
        Schema::table('crawler.extraction_policy_versions', function (Blueprint $table) {
            $table->uuid('policy_key')->nullable();
        });
        Schema::table('crawler.onboarding_execution_model_versions', function (Blueprint $table) {
            $table->uuid('model_key')->nullable();
            $table->boolean('is_default')->default(false);
        });

        $this->backfillLogicalKeys('crawler.discovery_policy_versions', 'policy_key');
        $this->backfillLogicalKeys('crawler.extraction_policy_versions', 'policy_key');
        $this->backfillLogicalKeys('crawler.onboarding_execution_model_versions', 'model_key');

        DB::statement('ALTER TABLE crawler.discovery_policy_versions ALTER COLUMN policy_key SET NOT NULL');
        DB::statement('ALTER TABLE crawler.extraction_policy_versions ALTER COLUMN policy_key SET NOT NULL');
        DB::statement('ALTER TABLE crawler.onboarding_execution_model_versions ALTER COLUMN model_key SET NOT NULL');

        DB::statement('ALTER TABLE crawler.discovery_policy_versions DROP CONSTRAINT discovery_policy_status_check');
        DB::statement('ALTER TABLE crawler.extraction_policy_versions DROP CONSTRAINT extraction_policy_status_check');
        DB::statement('ALTER TABLE crawler.onboarding_execution_model_versions DROP CONSTRAINT onboarding_model_status_check');
        DB::statement("UPDATE crawler.discovery_policy_versions SET status = 'archived' WHERE status = 'retired'");
        DB::statement("UPDATE crawler.extraction_policy_versions SET status = 'archived' WHERE status = 'retired'");
        DB::statement("UPDATE crawler.onboarding_execution_model_versions SET status = 'archived' WHERE status = 'retired'");
        DB::statement("ALTER TABLE crawler.discovery_policy_versions ALTER COLUMN status SET DEFAULT 'draft'");
        DB::statement("ALTER TABLE crawler.extraction_policy_versions ALTER COLUMN status SET DEFAULT 'draft'");
        DB::statement("ALTER TABLE crawler.onboarding_execution_model_versions ALTER COLUMN status SET DEFAULT 'draft'");
        DB::statement("ALTER TABLE crawler.discovery_policy_versions ADD CONSTRAINT discovery_policy_status_check CHECK (status IN ('draft', 'available', 'archived'))");
        DB::statement("ALTER TABLE crawler.extraction_policy_versions ADD CONSTRAINT extraction_policy_status_check CHECK (status IN ('draft', 'available', 'archived'))");
        DB::statement("ALTER TABLE crawler.onboarding_execution_model_versions ADD CONSTRAINT onboarding_model_status_check CHECK (status IN ('draft', 'available', 'archived'))");

        DB::statement('CREATE UNIQUE INDEX discovery_policy_key_version_unique ON crawler.discovery_policy_versions (policy_key, version)');
        DB::statement('CREATE UNIQUE INDEX extraction_policy_key_version_unique ON crawler.extraction_policy_versions (policy_key, version)');
        DB::statement('CREATE UNIQUE INDEX onboarding_model_key_version_unique ON crawler.onboarding_execution_model_versions (model_key, version)');
        DB::statement('CREATE UNIQUE INDEX discovery_policy_name_version_unique_ci ON crawler.discovery_policy_versions (lower(name), version)');
        DB::statement('CREATE UNIQUE INDEX extraction_policy_name_version_unique_ci ON crawler.extraction_policy_versions (lower(name), version)');
        DB::statement('CREATE UNIQUE INDEX onboarding_model_name_version_unique_ci ON crawler.onboarding_execution_model_versions (lower(name), version)');
        DB::statement("CREATE UNIQUE INDEX discovery_policy_one_draft_per_key ON crawler.discovery_policy_versions (policy_key) WHERE status = 'draft'");
        DB::statement("CREATE UNIQUE INDEX extraction_policy_one_draft_per_key ON crawler.extraction_policy_versions (policy_key) WHERE status = 'draft'");
        DB::statement("CREATE UNIQUE INDEX onboarding_model_one_draft_per_key ON crawler.onboarding_execution_model_versions (model_key) WHERE status = 'draft'");
        DB::statement('CREATE UNIQUE INDEX onboarding_model_single_default ON crawler.onboarding_execution_model_versions (is_default) WHERE is_default = true');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS crawler.onboarding_model_single_default');
        DB::statement('DROP INDEX IF EXISTS crawler.onboarding_model_one_draft_per_key');
        DB::statement('DROP INDEX IF EXISTS crawler.extraction_policy_one_draft_per_key');
        DB::statement('DROP INDEX IF EXISTS crawler.discovery_policy_one_draft_per_key');
        DB::statement('DROP INDEX IF EXISTS crawler.onboarding_model_name_version_unique_ci');
        DB::statement('DROP INDEX IF EXISTS crawler.extraction_policy_name_version_unique_ci');
        DB::statement('DROP INDEX IF EXISTS crawler.discovery_policy_name_version_unique_ci');
        DB::statement('DROP INDEX IF EXISTS crawler.onboarding_model_key_version_unique');
        DB::statement('DROP INDEX IF EXISTS crawler.extraction_policy_key_version_unique');
        DB::statement('DROP INDEX IF EXISTS crawler.discovery_policy_key_version_unique');

        DB::statement('ALTER TABLE crawler.discovery_policy_versions DROP CONSTRAINT discovery_policy_status_check');
        DB::statement('ALTER TABLE crawler.extraction_policy_versions DROP CONSTRAINT extraction_policy_status_check');
        DB::statement('ALTER TABLE crawler.onboarding_execution_model_versions DROP CONSTRAINT onboarding_model_status_check');
        DB::statement("UPDATE crawler.discovery_policy_versions SET status = 'retired' WHERE status IN ('draft', 'archived')");
        DB::statement("UPDATE crawler.extraction_policy_versions SET status = 'retired' WHERE status IN ('draft', 'archived')");
        DB::statement("UPDATE crawler.onboarding_execution_model_versions SET status = 'retired' WHERE status IN ('draft', 'archived')");
        DB::statement("ALTER TABLE crawler.discovery_policy_versions ALTER COLUMN status SET DEFAULT 'available'");
        DB::statement("ALTER TABLE crawler.extraction_policy_versions ALTER COLUMN status SET DEFAULT 'available'");
        DB::statement("ALTER TABLE crawler.onboarding_execution_model_versions ALTER COLUMN status SET DEFAULT 'available'");
        DB::statement("ALTER TABLE crawler.discovery_policy_versions ADD CONSTRAINT discovery_policy_status_check CHECK (status IN ('available', 'retired'))");
        DB::statement("ALTER TABLE crawler.extraction_policy_versions ADD CONSTRAINT extraction_policy_status_check CHECK (status IN ('available', 'retired'))");
        DB::statement("ALTER TABLE crawler.onboarding_execution_model_versions ADD CONSTRAINT onboarding_model_status_check CHECK (status IN ('available', 'retired'))");

        Schema::table('crawler.onboarding_execution_model_versions', function (Blueprint $table) {
            $table->dropColumn(['model_key', 'is_default']);
        });
        Schema::table('crawler.extraction_policy_versions', function (Blueprint $table) {
            $table->dropColumn('policy_key');
        });
        Schema::table('crawler.discovery_policy_versions', function (Blueprint $table) {
            $table->dropColumn('policy_key');
        });

        Schema::dropIfExists('crawler.discovery_strategies');
    }

    private function backfillLogicalKeys(string $table, string $column): void
    {
        DB::table($table)
            ->select('name')
            ->distinct()
            ->orderBy('name')
            ->pluck('name')
            ->each(function (string $name) use ($column, $table): void {
                DB::table($table)
                    ->where('name', $name)
                    ->update([$column => (string) Str::uuid()]);
            });
    }
};
