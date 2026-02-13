import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'monthly' | 'annual';
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  paystack_subscription_code: string | null;
  amount: number;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

const FREE_TRANSACTION_LIMIT = Infinity;

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactionCount, setTransactionCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching subscription:', error);
        }
        setSubscription(data as Subscription | null);

        // Fetch current month transaction count for free tier limits
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth.toISOString());

        setTransactionCount(count || 0);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const isPro = subscription?.plan !== 'free' && subscription?.status === 'active';
  
  const canAddTransaction = isPro || transactionCount < FREE_TRANSACTION_LIMIT;
  
  const remainingTransactions = isPro ? Infinity : Math.max(0, FREE_TRANSACTION_LIMIT - transactionCount);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();
    setSubscription(data as Subscription | null);
    setLoading(false);
  };

  return {
    subscription,
    loading,
    isPro,
    canAddTransaction,
    remainingTransactions,
    transactionLimit: FREE_TRANSACTION_LIMIT,
    transactionCount,
    refresh,
  };
}
