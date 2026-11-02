<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    protected $fillable = ['id', 'name', 'legal_name', 'tax_number', 'currency', 'status'];
    public $incrementing = false;
    protected $keyType = 'string';

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class, 'company_id', 'id');
    }
}
