import { supabase } from './supabase';

export type PlanTier = 'starter' | 'pro' | 'scale';

export async function signUpBusinessOwner({
  fullName,
  email,
  password,
  businessName,
  industry,
  plan,
}: {
  fullName: string;
  email: string;
  password: string;
  businessName: string;
  industry: string;
  plan: PlanTier;
}) {
  if (!supabase) {
    return {
      demo: true,
      message: 'Supabase is not configured yet. This is demo-only onboarding.',
    };
  }

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'owner',
      },
    },
  });

  if (signUpError) {
    throw signUpError;
  }

  if (!authData.user) {
    throw new Error('No user was created during signup.');
  }

  const { error: rpcError } = await supabase.rpc('create_business_for_owner', {
    p_business_name: businessName,
    p_industry: industry,
    p_owner_full_name: fullName,
    p_owner_email: email,
    p_plan: plan,
  });

  if (rpcError) {
    throw rpcError;
  }

  return {
    demo: false,
    message: 'Your business account was created successfully.',
  };
}

export async function signInBusinessOwner({ email, password }: { email: string; password: string }) {
  if (!supabase) {
    return {
      demo: true,
      message: 'Supabase is not configured yet. Demo mode only.',
    };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return {
    demo: false,
    message: 'Signed in successfully.',
  };
}

export async function signOutBusinessOwner() {
  if (!supabase) {
    return { demo: true, message: 'Demo sign-out only.' };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  return { demo: false, message: 'Signed out successfully.' };
}
