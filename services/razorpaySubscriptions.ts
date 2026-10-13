import RazorpayCheckout from 'react-native-razorpay';
import type { SupabaseClient } from '@supabase/supabase-js';

export type RazorpayPlanCode = 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY';

export type SubscriptionEntitlement = {
  isPremium: boolean;
  plan?: string | null;
  expiresAt?: string | null;
  subscriptionId?: string | null;
  raw: unknown;
};

type CreateSubscriptionResponse = {
  subscription_id: string;
  key_id: string;
  plan_code: RazorpayPlanCode;
  short_url?: string | null;
};

type VerifySubscriptionResponse = {
  subscription_id: string;
  status: string;
  provider_status?: string;
  isPremium: boolean;
  expiresAt: string | null;
  message?: string;
};

async function invokeFunction<T>(
  supabase: SupabaseClient,
  functionName: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (error) {
    // Supabase may wrap the Edge Function's response in FunctionsHttpError.
    let message = error.message || `Request to ${functionName} failed`;
    try {
      const context = (error as unknown as { context?: Response }).context;
      if (context && typeof context.json === 'function') {
        const payload = await context.clone().json();
        if (payload?.error) message = String(payload.error);
      }
    } catch {
      // Keep the original Supabase error message when no JSON body is available.
    }
    throw new Error(message);
  }

  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

function findPremiumFlag(value: unknown, depth = 0): boolean {
  if (depth > 5 || value == null) return false;
  if (Array.isArray(value)) return value.some((item) => findPremiumFlag(item, depth + 1));
  if (typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;
  if (typeof obj.isPremium === 'boolean') return obj.isPremium;
  if (typeof obj.is_premium === 'boolean') return obj.is_premium;
  if (typeof obj.has_premium === 'boolean') return obj.has_premium;
  if (typeof obj.is_entitled === 'boolean') return obj.is_entitled;
  if (typeof obj.plan === 'string' && /premium|pro/i.test(obj.plan)) return true;
  if (typeof obj.plan_code === 'string' && /premium/i.test(obj.plan_code)) return true;
  if (typeof obj.status === 'string' && /active|in_grace_period/i.test(obj.status)) {
    // The RPC is the authority for entitlement; this is only a fallback when
    // the RPC returns a status-shaped object without an explicit boolean.
    return true;
  }
  return Object.values(obj).some((item) => findPremiumFlag(item, depth + 1));
}

function findString(value: unknown, keys: string[], depth = 0): string | null {
  if (depth > 5 || value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findString(item, keys, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  for (const key of keys) {
    if (typeof obj[key] === 'string') return obj[key] as string;
  }
  for (const item of Object.values(obj)) {
    const found = findString(item, keys, depth + 1);
    if (found) return found;
  }
  return null;
}

export async function fetchSubscriptionEntitlement(
  supabase: SupabaseClient,
): Promise<SubscriptionEntitlement> {
  const result = await invokeFunction<{ user_id: string; entitlement: unknown }>(
    supabase,
    'razorpay-entitlement',
  );
  const raw = result?.entitlement ?? result;
  return {
    isPremium: findPremiumFlag(raw),
    plan: findString(raw, ['plan_code', 'plan', 'name']),
    expiresAt: findString(raw, ['current_period_end', 'expires_at', 'expiresAt', 'period_end']),
    subscriptionId: findString(raw, ['subscription_id', 'subscriptionId', 'provider_subscription_id', 'sub_id', 'id']),
    raw,
  };
}

export async function startRazorpaySubscription(
  supabase: SupabaseClient,
  planCode: RazorpayPlanCode,
  businessName = 'The Geniuss',
): Promise<{ verification: VerifySubscriptionResponse; entitlement: SubscriptionEntitlement }> {
  const created = await invokeFunction<CreateSubscriptionResponse>(
    supabase,
    'razorpay-create-subscription',
    { plan_code: planCode },
  );

  if (!created?.subscription_id || !created?.key_id) {
    throw new Error('The server did not return the Razorpay subscription ID and public key ID.');
  }

  // react-native-razorpay requires a native development/production build; Expo Go is unsupported.
  const checkoutResult = await RazorpayCheckout.open({
    key: created.key_id,
    subscription_id: created.subscription_id,
    name: businessName,
    description: planCode === 'PREMIUM_MONTHLY' ? 'Premium Monthly' : 'Premium Yearly',
    theme: { color: '#8B7CFF' },
    retry: { enabled: true, max_count: 2 },
  } as any);

  const verification = await invokeFunction<VerifySubscriptionResponse>(
    supabase,
    'razorpay-verify-subscription',
    {
      subscription_id: created.subscription_id,
      razorpay_payment_id: checkoutResult.razorpay_payment_id,
      razorpay_signature: checkoutResult.razorpay_signature,
    },
  );

  // Always read entitlement from the backend instead of trusting the SDK callback.
  const entitlement = await fetchSubscriptionEntitlement(supabase);
  return { verification, entitlement };
}

export async function cancelRazorpaySubscription(
  supabase: SupabaseClient,
  subscriptionId?: string | null,
  cancelAtPeriodEnd = true,
): Promise<unknown> {
  const body: Record<string, unknown> = {
    cancel_at_period_end: cancelAtPeriodEnd,
  };
  if (subscriptionId) {
    body.subscription_id = subscriptionId;
  }
  return invokeFunction(supabase, 'razorpay-cancel-subscription', body);
}
