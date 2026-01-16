import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate, Database } from '@/integrations/supabase/types';

export type RecurringTransaction = Tables<'recurring_transactions'>;
export type RecurringTransactionInsert = TablesInsert<'recurring_transactions'>;
export type RecurringTransactionUpdate = TablesUpdate<'recurring_transactions'>;
export type RecurrenceFrequency = Database['public']['Enums']['recurrence_frequency'];

export const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export function useRecurringTransactions() {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecurringTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecurringTransactions(data || []);
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
      toast.error('Failed to load recurring transactions');
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchRecurringTransactions();
    setLoading(false);
  }, [fetchRecurringTransactions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addRecurringTransaction = async (
    transaction: Omit<RecurringTransactionInsert, 'user_id'>
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('recurring_transactions')
        .insert({
          ...transaction,
          user_id: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setRecurringTransactions(prev => [data, ...prev]);
      toast.success('Recurring transaction added');
      return data;
    } catch (error) {
      console.error('Error adding recurring transaction:', error);
      toast.error('Failed to add recurring transaction');
      throw error;
    }
  };

  const updateRecurringTransaction = async (
    id: string,
    updates: RecurringTransactionUpdate
  ) => {
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setRecurringTransactions(prev => prev.map(t => (t.id === id ? data : t)));
      toast.success('Recurring transaction updated');
      return data;
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      toast.error('Failed to update recurring transaction');
      throw error;
    }
  };

  const deleteRecurringTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRecurringTransactions(prev => prev.filter(t => t.id !== id));
      toast.success('Recurring transaction deleted');
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      toast.error('Failed to delete recurring transaction');
      throw error;
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    return updateRecurringTransaction(id, { is_active: isActive });
  };

  // Process a single recurring transaction manually (trigger generation)
  const processNow = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-recurring', {
        body: { recurring_id: id },
      });

      if (error) throw error;
      
      toast.success('Transaction generated successfully');
      await fetchRecurringTransactions(); // Refresh to get updated next_occurrence
      return data;
    } catch (error) {
      console.error('Error processing recurring transaction:', error);
      toast.error('Failed to process recurring transaction');
      throw error;
    }
  };

  return {
    recurringTransactions,
    loading,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    toggleActive,
    processNow,
    refresh: loadData,
  };
}
