<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OwnerSetupController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ShiftController;
use App\Models\PosCustomer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Lightweight readiness probe used by Render. Keep the production driver guard,
// but avoid opening a fresh TiDB connection for every health check.
Route::get('/health', function () {
    if (app()->environment('production') && DB::connection()->getDriverName() !== 'mysql') {
        return response()->json(['status' => 'unavailable'], 503);
    }

    return response()->json(['status' => 'ok']);
});

// Public Authentication endpoints
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/pin', [AuthController::class, 'login']);

// First owner setup is closed unless a strong secret is configured and users is empty.
Route::get('/setup', [OwnerSetupController::class, 'status'])->middleware('throttle:30,1');
Route::post('/setup', [OwnerSetupController::class, 'create'])->middleware('throttle:10,1');

// Protected POS Routes (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // Auth Session
    Route::get('/auth/session', [AuthController::class, 'session']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Reports (RBAC protected: Cashier only)
    Route::get('/reports', [ReportController::class, 'index']);
    Route::get('/reports/invoices', [ReportController::class, 'invoices']);
    Route::get('/branches', [BranchController::class, 'index']);
    Route::post('/branches', [BranchController::class, 'store']);

    // Tenant-scoped catalog and inventory APIs
    Route::get('/catalog/categories', [CatalogController::class, 'categories']);
    Route::get('/catalog/products', [CatalogController::class, 'products']);
    Route::post('/catalog/categories', [CatalogController::class, 'storeCategory']);
    Route::delete('/catalog/categories/{categoryId}', [CatalogController::class, 'deleteCategory']);
    Route::post('/catalog/products', [CatalogController::class, 'storeProduct']);
    Route::patch('/catalog/products/{productId}', [CatalogController::class, 'updateProduct']);
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::get('/inventory/movements', [InventoryController::class, 'movements']);
    Route::post('/inventory/adjustments', [InventoryController::class, 'adjust']);

    // Orders (Role validated: Cashier partner allowed, Staff cash only)
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::patch('/orders/{id}/status', [OrderController::class, 'updateStatus']);
    Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel']);

    // Shifts
    Route::get('/shifts', [ShiftController::class, 'index']);
    Route::get('/shifts/active', [ShiftController::class, 'active']);
    Route::get('/shifts/{id}/report', [ShiftController::class, 'report']);
    Route::get('/shifts/{id}/invoices', [ShiftController::class, 'invoices']);
    Route::post('/shifts', [ShiftController::class, 'store']);
    Route::post('/shifts/close-branch', [ShiftController::class, 'closeBranch']);
    Route::post('/shifts/{id}/close', [ShiftController::class, 'close']);

    // Customers metadata
    Route::get('/customers', function () {
        return response()->json([
            'success' => true,
            'customers' => PosCustomer::all(),
        ]);
    });
});
