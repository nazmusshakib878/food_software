<?php

namespace Database\Seeders;

use App\Models\PosCategory;
use App\Models\PosProduct;
use Illuminate\Database\Seeder;

class PosCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $catalog = json_decode(file_get_contents(__DIR__.'/pos_catalog.json'), true, 512, JSON_THROW_ON_ERROR);
        $companyId = 'CMP-001';
        $branchId = 'BR-001';

        foreach ($catalog['categories'] as $index => $category) {
            PosCategory::updateOrCreate(
                ['company_id' => $companyId, 'branch_id' => $branchId, 'category_id' => $category['id']],
                [
                    'name_en' => $category['nameEn'],
                    'name_ar' => $category['nameAr'],
                    'icon' => $category['icon'] ?? null,
                    'sort_order' => $index,
                    'is_active' => true,
                ]
            );
        }

        foreach ($catalog['products'] as $item) {
            PosProduct::updateOrCreate(
                ['company_id' => $companyId, 'branch_id' => $branchId, 'product_id' => $item['id']],
                [
                    'category_id' => $item['catId'],
                    'code' => $item['code'] ?? null,
                    'name_en' => $item['enName'],
                    'name_ar' => $item['arName'],
                    'subtitle_en' => $item['subtitleEn'] ?? null,
                    'subtitle_ar' => $item['subtitleAr'] ?? null,
                    'image' => $item['image'] ?? null,
                    'price' => $item['price'],
                    'tax_rate' => 15,
                    'available' => (bool)($item['available'] ?? true),
                    'track_stock' => false,
                    'stock_on_hand' => null,
                ]
            );
        }
    }
}
