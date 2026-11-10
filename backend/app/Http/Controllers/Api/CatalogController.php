<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PosCategory;
use App\Models\PosProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    public function categories(Request $request): JsonResponse
    {
        $user = $request->user();
        $cacheKey = $this->categoryCacheKey($user->company_id, $user->branch_id);
        $categories = Cache::remember($cacheKey, now()->addMinutes(10), fn () => PosCategory::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get());

        return response()->json(['success' => true, 'categories' => $categories]);
    }

    public function products(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = PosProduct::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id);
        if ($request->boolean('available')) $query->where('available', true);
        if ($request->filled('categoryId')) $query->where('category_id', $request->query('categoryId'));

        return response()->json(['success' => true, 'products' => $query->orderBy('name_en')->get()]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->canManageCatalog($user), 403, 'Catalog management permission required');
        $data = $request->validate([
            'categoryId' => ['required', 'string', 'max:80', 'regex:/^[A-Za-z0-9_-]+$/'],
            'parentCategoryId' => ['nullable', 'string', 'max:80'],
            'nameEn' => ['required', 'string', 'max:120'],
            'nameAr' => ['required', 'string', 'max:120'],
            'icon' => ['nullable', 'string', 'max:80'],
            'sortOrder' => ['nullable', 'integer', 'min:0'],
        ]);
        if (!empty($data['parentCategoryId'])) {
            PosCategory::where('company_id', $user->company_id)->where('branch_id', $user->branch_id)
                ->where('category_id', $data['parentCategoryId'])->where('is_active', true)->firstOrFail();
        }
        $category = PosCategory::create([
            'company_id' => $user->company_id,
            'branch_id' => $user->branch_id,
            'category_id' => $data['categoryId'],
            'parent_category_id' => $data['parentCategoryId'] ?? null,
            'name_en' => $data['nameEn'],
            'name_ar' => $data['nameAr'],
            'icon' => $data['icon'] ?? null,
            'sort_order' => $data['sortOrder'] ?? 0,
        ]);
        $this->forgetCategoriesAfterCommit($user->company_id, $user->branch_id);

        return response()->json(['success' => true, 'category' => $category], 201);
    }

    public function deleteCategory(Request $request, string $categoryId): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->canManageCatalog($user), 403, 'Catalog management permission required');
        $data = $request->validate(['moveToCategoryId' => ['required', 'string', 'max:80']]);
        if ($categoryId === $data['moveToCategoryId']) {
            return response()->json(['success' => false, 'error' => 'Choose a different destination category.'], 422);
        }
        DB::transaction(function () use ($user, $categoryId, $data) {
            $category = PosCategory::where('company_id', $user->company_id)->where('branch_id', $user->branch_id)
                ->where('category_id', $categoryId)->where('is_active', true)->lockForUpdate()->firstOrFail();
            $target = PosCategory::where('company_id', $user->company_id)->where('branch_id', $user->branch_id)
                ->where('category_id', $data['moveToCategoryId'])->where('is_active', true)->firstOrFail();
            PosProduct::where('company_id', $user->company_id)->where('branch_id', $user->branch_id)
                ->where('category_id', $category->category_id)->update(['category_id' => $target->category_id]);
            $category->update(['is_active' => false]);
        });
        $this->forgetCategoriesAfterCommit($user->company_id, $user->branch_id);
        return response()->json(['success' => true]);
    }

    public function storeProduct(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->canManageCatalog($user), 403, 'Catalog management permission required');
        $data = $request->validate([
            'productId' => ['required', 'string', 'max:80', 'regex:/^[A-Za-z0-9_-]+$/'],
            'categoryId' => ['required', 'string', 'max:80'],
            'code' => ['nullable', 'string', 'max:80'],
            'nameEn' => ['required', 'string', 'max:150'],
            'nameAr' => ['required', 'string', 'max:150'],
            'subtitleEn' => ['nullable', 'string', 'max:180'],
            'subtitleAr' => ['nullable', 'string', 'max:180'],
            'image' => ['nullable', $this->imageRule()],
            'price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'taxRate' => ['required', 'numeric', 'min:0', 'max:100'],
            'available' => ['sometimes', 'boolean'],
            'trackStock' => ['sometimes', 'boolean'],
            'stockOnHand' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'lowStockThreshold' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
        ]);
        $category = PosCategory::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->where('category_id', $data['categoryId'])
            ->where('is_active', true)->firstOrFail();

        $product = PosProduct::create([
            'company_id' => $user->company_id,
            'branch_id' => $user->branch_id,
            'product_id' => $data['productId'],
            'category_id' => $category->category_id,
            'code' => $data['code'] ?? null,
            'name_en' => $data['nameEn'], 'name_ar' => $data['nameAr'],
            'subtitle_en' => $data['subtitleEn'] ?? null, 'subtitle_ar' => $data['subtitleAr'] ?? null,
            'image' => $data['image'] ?? null,
            'price' => $data['price'], 'tax_rate' => $data['taxRate'],
            'available' => $data['available'] ?? true, 'track_stock' => $data['trackStock'] ?? false,
            'stock_on_hand' => (($data['trackStock'] ?? false) ? ($data['stockOnHand'] ?? 0) : null),
            'low_stock_threshold' => $data['lowStockThreshold'] ?? null,
        ]);
        $this->forgetCategoriesAfterCommit($user->company_id, $user->branch_id);

        return response()->json(['success' => true, 'product' => $product], 201);
    }

    public function updateProduct(Request $request, string $productId): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->canManageCatalog($user), 403, 'Catalog management permission required');
        $product = PosProduct::where('company_id', $user->company_id)
            ->where('branch_id', $user->branch_id)
            ->where('product_id', $productId)->firstOrFail();
        $data = $request->validate([
            'categoryId' => ['sometimes', 'string', 'max:80'],
            'code' => ['nullable', 'string', 'max:80'],
            'nameEn' => ['sometimes', 'string', 'max:150'], 'nameAr' => ['sometimes', 'string', 'max:150'],
            'subtitleEn' => ['nullable', 'string', 'max:180'], 'subtitleAr' => ['nullable', 'string', 'max:180'],
            'image' => ['nullable', $this->imageRule()],
            'price' => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
            'taxRate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'available' => ['sometimes', 'boolean'],
            'trackStock' => ['sometimes', 'boolean'],
            'lowStockThreshold' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
        ]);

        if (isset($data['categoryId'])) {
            PosCategory::where('company_id', $user->company_id)->where('branch_id', $user->branch_id)
                ->where('category_id', $data['categoryId'])->where('is_active', true)->firstOrFail();
            $product->category_id = $data['categoryId'];
        }
        foreach (['code' => 'code', 'nameEn' => 'name_en', 'nameAr' => 'name_ar', 'subtitleEn' => 'subtitle_en',
            'subtitleAr' => 'subtitle_ar', 'image' => 'image', 'price' => 'price', 'taxRate' => 'tax_rate',
            'available' => 'available', 'lowStockThreshold' => 'low_stock_threshold'] as $input => $column) {
            if (array_key_exists($input, $data)) $product->{$column} = $data[$input];
        }
        if (array_key_exists('trackStock', $data)) {
            $product->track_stock = $data['trackStock'];
            if (!$product->track_stock) $product->stock_on_hand = null;
            elseif ($product->stock_on_hand === null) $product->stock_on_hand = 0;
        }
        $product->save();
        $this->forgetCategoriesAfterCommit($user->company_id, $user->branch_id);

        return response()->json(['success' => true, 'product' => $product->refresh()]);
    }

    private function canManageCatalog($user): bool
    {
        return $user->role === 'admin' || in_array('catalog_manage', $user->permissions ?? [], true);
    }

    private function categoryCacheKey(string $companyId, string $branchId): string
    {
        return 'catalog:categories:'.hash('sha256', $companyId."\0".$branchId);
    }

    private function forgetCategoriesAfterCommit(string $companyId, string $branchId): void
    {
        DB::afterCommit(fn () => Cache::forget($this->categoryCacheKey($companyId, $branchId)));
    }

    private function imageRule(): \Closure
    {
        return static function (string $attribute, mixed $value, \Closure $fail): void {
            if ($value === null || $value === '') return;

            if (is_string($value) && strlen($value) <= 2048 && filter_var($value, FILTER_VALIDATE_URL)) {
                if (in_array(strtolower((string) parse_url($value, PHP_URL_SCHEME)), ['http', 'https'], true)) return;
            }

            if (!is_string($value) || strlen($value) > 2_800_000 || !preg_match(
                '/\Adata:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+\/=]+)\z/D',
                $value,
                $matches,
            )) {
                $fail('The image must be an HTTP(S) URL or a supported image up to 2 MB.');
                return;
            }

            $contents = base64_decode($matches[2], true);
            if ($contents === false || strlen($contents) > 2 * 1024 * 1024) {
                $fail('The uploaded image must not exceed 2 MB.');
                return;
            }

            $image = @getimagesizefromstring($contents);
            $expectedMime = 'image/'.$matches[1];
            if (!$image || $image['mime'] !== $expectedMime
                || $image[0] > 4096 || $image[1] > 4096 || ($image[0] * $image[1]) > 16_000_000) {
                $fail('The uploaded image content does not match its file type.');
            }
        };
    }
}
