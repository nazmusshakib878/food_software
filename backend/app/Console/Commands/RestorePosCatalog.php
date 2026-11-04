<?php

namespace App\Console\Commands;

use App\Models\Branch;
use App\Models\Company;
use App\Models\PosCategory;
use App\Models\PosProduct;
use Database\Seeders\PosCatalogSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RestorePosCatalog extends Command
{
    protected $signature = 'pos:restore-catalog {--dry-run} {--force : Required for production writes}';
    protected $description = 'Restore the canonical CMP-001 / BR-001 POS catalog without touching orders or users';

    public function handle(): int
    {
        $company = Company::query()->whereKey('CMP-001')->where('status', 'active')->first();
        $branch = Branch::query()->where('company_id', 'CMP-001')->where('code', 'BR-001')->where('status', 'active')->first();
        if (!$company || !$branch) { $this->error('CMP-001 / BR-001 is not active.'); return self::FAILURE; }
        $source = json_decode(file_get_contents(database_path('seeders/pos_catalog.json')), true, 512, JSON_THROW_ON_ERROR);
        $existingCategories = PosCategory::query()->where('company_id', 'CMP-001')->where('branch_id', 'BR-001')->count();
        $existingProducts = PosProduct::query()->where('company_id', 'CMP-001')->where('branch_id', 'BR-001')->count();
        $this->table(['Target', 'Source', 'Existing'], [['Categories', count($source['categories']), $existingCategories], ['Products', count($source['products']), $existingProducts]]);
        if ($this->option('dry-run')) { $this->info('Dry run passed; no data changed.'); return self::SUCCESS; }
        if (app()->environment('production') && !$this->option('force')) { $this->error('Production writes require --force.'); return self::FAILURE; }
        DB::transaction(fn () => app(PosCatalogSeeder::class)->run(), 3);
        $this->info('Catalog restored. Orders, users, shifts, and authentication were not changed.');
        return self::SUCCESS;
    }
}
