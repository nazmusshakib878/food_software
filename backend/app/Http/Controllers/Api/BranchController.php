<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BranchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $branches = Branch::where('company_id', $request->user()->company_id)
            ->where('status', 'active')->orderBy('name')->get(['code', 'name', 'timezone', 'status']);
        return response()->json(['success' => true, 'branches' => $branches]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->role === 'admin' || in_array('branches_manage', $user->permissions ?? [], true), 403, 'Branch management permission required.');
        $data = $request->validate([
            'code' => ['required', 'string', 'max:80', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique('branches', 'code')->where('company_id', $user->company_id)],
            'name' => ['required', 'string', 'max:160'],
            'timezone' => ['sometimes', 'string', 'timezone', 'max:64'],
        ]);
        $branch = Branch::create([
            'company_id' => $user->company_id,
            'code' => $data['code'],
            'name' => $data['name'],
            'timezone' => $data['timezone'] ?? 'Asia/Riyadh',
            'status' => 'active',
        ]);
        return response()->json(['success' => true, 'branch' => $branch], 201);
    }
}
