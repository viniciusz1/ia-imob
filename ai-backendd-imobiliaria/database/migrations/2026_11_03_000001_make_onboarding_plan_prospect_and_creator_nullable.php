<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE crawler.onboarding_plans ALTER COLUMN prospect_id DROP NOT NULL');
        DB::statement('ALTER TABLE crawler.onboarding_plans ALTER COLUMN created_by DROP NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DELETE FROM crawler.onboarding_plans WHERE prospect_id IS NULL OR created_by IS NULL');
        DB::statement('ALTER TABLE crawler.onboarding_plans ALTER COLUMN prospect_id SET NOT NULL');
        DB::statement('ALTER TABLE crawler.onboarding_plans ALTER COLUMN created_by SET NOT NULL');
    }
};
