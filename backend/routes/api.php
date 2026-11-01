<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ShiftController;
use App\Models\PosCustomer;
use Illuminate\Support\Facades\Route;

// Public Authentication endpoints
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/pin', [AuthController::class, 'login']);

// Protected POS Routes (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // Auth Session
    Route::get('/auth/session', [AuthController::class, 'session']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Reports (RBAC protected: Cashier only)
    Route::get('/reports', [ReportController::class, 'index']);

    // Orders (Role validated: Cashier partner allowed, Staff cash only)
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);

    // Shifts
    Route::get('/shifts/active', [ShiftController::class, 'active']);
    Route::post('/shifts', [ShiftController::class, 'store']);
    Route::post('/shifts/{id}/close', [ShiftController::class, 'close']);

    // Customers metadata
    Route::get('/customers', function () {
        return response()->json([
            'success' => true,
            'customers' => PosCustomer::all(),
        ]);
    });
});
