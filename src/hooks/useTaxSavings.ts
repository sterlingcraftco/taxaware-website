import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TaxSavingsAccount {
  id: string;
  user_id: string;
  balance: number;
  total_deposits: number;
  total_withdrawals: number;
  total_interest_earned: number;
  last_interest_date: string | null;
  has_withdrawal_this_quarter: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavingsTransaction {
  id: string;
  user_id: string;
  account_id: string;
  type: 'deposit' | 'withdrawal' | 'interest' | 'withdrawal_request';
  amount: number;
  balance_after: number;
  reference: string | null;
  paystack_reference: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  withdrawal_type: 'bank_transfer' | 'tax_payment';
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const MINIMUM_DEPOSIT = 1000;

export function useTaxSavings() {
  const [account, setAccount] = useState<TaxSavingsAccount | null>(null);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccount = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('tax_savings_accounts')
        .select('*')
        .eq('user_id', userData.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching account:', error);
      }
      
      setAccount(data as TaxSavingsAccount | null);
    } catch (error) {
      console.error('Error fetching account:', error);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('savings_transactions')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }
      
      setTransactions((data || []) as SavingsTransaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, []);

  const fetchWithdrawalRequests = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching withdrawal requests:', error);
        return;
      }
      
      setWithdrawalRequests((data || []) as WithdrawalRequest[]);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchAccount(), fetchTransactions(), fetchWithdrawalRequests()]);
    setLoading(false);
  }, [fetchAccount, fetchTransactions, fetchWithdrawalRequests]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const initializeDeposit = async (amount: number, callbackUrl: string) => {
    if (amount < MINIMUM_DEPOSIT) {
      toast.error(`Minimum deposit is NGN ${MINIMUM_DEPOSIT.toLocaleString()}`);
      return null;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Please log in to make a deposit');
        return null;
      }

      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('paystack-initialize', {
        body: {
          amount,
          email: userData.user.email,
          callback_url: callbackUrl,
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || 'Failed to initialize payment');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error initializing deposit:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initialize payment');
      return null;
    }
  };

  const verifyDeposit = useCallback(async (reference: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('paystack-verify', {
        body: { reference },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || 'Failed to verify payment');
      }

      // Only show toast if not already processed
      if (!response.data.data?.already_processed) {
        toast.success('Deposit successful!');
      }
      
      await loadData();
      return response.data.data;
    } catch (error) {
      console.error('Error verifying deposit:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to verify payment');
      return null;
    }
  }, [loadData]);

  const requestWithdrawal = async (data: {
    amount: number;
    withdrawal_type: 'bank_transfer' | 'tax_payment';
    bank_name?: string;
    account_number?: string;
    account_name?: string;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Please log in to request withdrawal');
        return null;
      }

      if (!account) {
        toast.error('No savings account found');
        return null;
      }

      if (data.amount > account.balance) {
        toast.error('Insufficient balance');
        return null;
      }

      const { data: result, error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: userData.user.id,
          account_id: account.id,
          amount: data.amount,
          withdrawal_type: data.withdrawal_type,
          bank_name: data.bank_name || null,
          account_number: data.account_number || null,
          account_name: data.account_name || null,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchWithdrawalRequests();
      toast.success('Withdrawal request submitted. Processing takes 24 hours.');
      return result;
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      toast.error('Failed to submit withdrawal request');
      return null;
    }
  };

  const cancelWithdrawal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('status', 'pending');

      if (error) throw error;

      await fetchWithdrawalRequests();
      toast.success('Withdrawal request cancelled');
    } catch (error) {
      console.error('Error cancelling withdrawal:', error);
      toast.error('Failed to cancel withdrawal request');
    }
  };

  const pendingWithdrawals = withdrawalRequests.filter(w => w.status === 'pending');
  const pendingAmount = pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
  const availableBalance = account ? Number(account.balance) - pendingAmount : 0;

  return {
    account,
    transactions,
    withdrawalRequests,
    loading,
    initializeDeposit,
    verifyDeposit,
    requestWithdrawal,
    cancelWithdrawal,
    refresh: loadData,
    pendingWithdrawals,
    availableBalance,
    MINIMUM_DEPOSIT,
  };
}
