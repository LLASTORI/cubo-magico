import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Plan {
  id: string;
  name: string;
  type: 'monthly' | 'yearly' | 'lifetime' | 'trial';
  description: string | null;
  max_projects: number;
  price_cents: number;
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'trial' | 'expired' | 'cancelled' | 'pending';
  starts_at: string;
  expires_at: string | null;
  trial_ends_at: string | null;
  is_trial: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  origin: 'manual' | 'hotmart' | 'stripe' | 'other';
  external_id: string | null;
  plan?: Plan;
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export const useSubscriptions = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('max_projects', { ascending: true });
    
    if (error) {
      console.error('Error fetching plans:', error);
      return [];
    }
    return data || [];
  };

  const fetchSubscriptions = async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plans(*),
        profile:profiles!subscriptions_user_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching subscriptions:', error);
      // Try without the profile join if foreign key doesn't exist
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select(`*, plan:plans(*)`)
        .order('created_at', { ascending: false });
      
      if (subsError) {
        console.error('Error fetching subscriptions:', subsError);
        return [];
      }
      return subsData || [];
    }
    return data || [];
  };

  const fetchUserSubscription = async () => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`*, plan:plans(*)`)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }
    return data;
  };

  const createSubscription = async (params: {
    user_id: string;
    plan_id: string;
    is_trial: boolean;
    trial_days?: number;
    expires_months?: number;
    notes?: string;
  }) => {
    const now = new Date();
    const startsAt = now.toISOString();
    
    let expiresAt: string | null = null;
    let trialEndsAt: string | null = null;
    
    if (params.is_trial && params.trial_days) {
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + params.trial_days);
      trialEndsAt = trialEnd.toISOString();
    }
    
    if (params.expires_months) {
      const expireDate = new Date(now);
      expireDate.setMonth(expireDate.getMonth() + params.expires_months);
      expiresAt = expireDate.toISOString();
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: params.user_id,
        plan_id: params.plan_id,
        status: params.is_trial ? 'trial' : 'active',
        starts_at: startsAt,
        expires_at: expiresAt,
        trial_ends_at: trialEndsAt,
        is_trial: params.is_trial,
        notes: params.notes,
        created_by: user?.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
    
    await refresh();
    return data;
  };

  const updateSubscription = async (id: string, updates: Partial<{
    plan_id: string;
    status: 'active' | 'trial' | 'expired' | 'cancelled' | 'pending';
    expires_at: string | null;
    trial_ends_at: string | null;
    is_trial: boolean;
    notes: string;
  }>) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
    
    await refresh();
    return data;
  };

  const deleteSubscription = async (id: string) => {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting subscription:', error);
      throw error;
    }
    
    await refresh();
  };

  const extendSubscription = async (id: string, months: number) => {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) throw new Error('Subscription not found');
    
    const baseDate = sub.expires_at ? new Date(sub.expires_at) : new Date();
    baseDate.setMonth(baseDate.getMonth() + months);
    
    return updateSubscription(id, { 
      expires_at: baseDate.toISOString(),
      status: 'active'
    });
  };

  const activateFromTrial = async (id: string, months: number) => {
    const now = new Date();
    now.setMonth(now.getMonth() + months);
    
    return updateSubscription(id, {
      status: 'active',
      is_trial: false,
      trial_ends_at: null,
      expires_at: now.toISOString()
    });
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const [plansData, subsData] = await Promise.all([
        fetchPlans(),
        fetchSubscriptions()
      ]);
      setPlans(plansData);
      setSubscriptions(subsData);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return {
    plans,
    subscriptions,
    loading,
    error,
    fetchUserSubscription,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    extendSubscription,
    activateFromTrial,
    refresh
  };
};
