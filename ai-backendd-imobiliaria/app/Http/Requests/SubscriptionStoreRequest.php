<?php

namespace App\Http\Requests;

use App\Enums\BillingType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubscriptionStoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() && $this->user()->can('subscriptions.manage');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'plan_slug'    => ['required', 'string', 'exists:subscription_plans,slug'],
            'billing_type' => ['required', 'string', Rule::enum(BillingType::class)],
        ];
    }
}
