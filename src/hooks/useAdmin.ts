import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

interface AdminStats {
  totalUsers: number;
  totalSavingsBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalInterestPaid: number;
  pendingWithdrawals: number;
  pendingWithdrawalAmount: number;
}

interface AdminWithdrawalRequest {
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
  notes: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
  tax_savings_accounts?: {
    balance: number;
  };
}

interface AdminSavingsAccount {
  id: string;
  user_id: string;
  balance: number;
  total_deposits: number;
  total_withdrawals: number;
  total_interest_earned: number;
  has_withdrawal_this_quarter: boolean;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<AdminWithdrawalRequest[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<AdminSavingsAccount[]>([]);

  const checkAdminStatus = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;

    try {
      // Fetch all savings accounts for stats
      const { data: accounts } = await supabase
        .from('tax_savings_accounts')
        .select('*');

      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', 'pending');

      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (accounts) {
        const stats: AdminStats = {
          totalUsers: userCount || 0,
          totalSavingsBalance: accounts.reduce((sum, a) => sum + Number(a.balance), 0),
          totalDeposits: accounts.reduce((sum, a) => sum + Number(a.total_deposits), 0),
          totalWithdrawals: accounts.reduce((sum, a) => sum + Number(a.total_withdrawals), 0),
          totalInterestPaid: accounts.reduce((sum, a) => sum + Number(a.total_interest_earned), 0),
          pendingWithdrawals: withdrawals?.length || 0,
          pendingWithdrawalAmount: withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0,
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [isAdmin]);

  const fetchWithdrawalRequests = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          tax_savings_accounts (balance)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set((data || []).map(w => w.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      const enrichedData = (data || []).map(w => ({
        ...w,
        profiles: profileMap.get(w.user_id) || null,
      }));

      setWithdrawalRequests(enrichedData as AdminWithdrawalRequest[]);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
    }
  }, [isAdmin]);

  const fetchSavingsAccounts = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from('tax_savings_accounts')
        .select('*')
        .order('balance', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set((data || []).map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      const enrichedData = (data || []).map(a => ({
        ...a,
        profiles: profileMap.get(a.user_id) || null,
      }));

      setSavingsAccounts(enrichedData as AdminSavingsAccount[]);
    } catch (error) {
      console.error('Error fetching savings accounts:', error);
    }
  }, [isAdmin]);

  const processWithdrawal = async (withdrawalId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('process-withdrawal', {
        body: { 
          withdrawal_id: withdrawalId, 
          action, 
          notes 
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || 'Failed to process withdrawal');
      }

      await Promise.all([fetchWithdrawalRequests(), fetchStats(), fetchSavingsAccounts()]);
      toast.success(`Withdrawal ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      return true;
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process withdrawal');
      return false;
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    await checkAdminStatus();
    setLoading(false);
  }, [checkAdminStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchWithdrawalRequests();
      fetchSavingsAccounts();
    }
  }, [isAdmin, fetchStats, fetchWithdrawalRequests, fetchSavingsAccounts]);

  return {
    isAdmin,
    loading,
    stats,
    withdrawalRequests,
    savingsAccounts,
    processWithdrawal,
    refresh: () => {
      fetchStats();
      fetchWithdrawalRequests();
      fetchSavingsAccounts();
    },
  };
}
