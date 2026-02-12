import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
}

interface FeatureFlagTarget {
  id: string;
  flag_id: string;
  email: string;
}

/**
 * Check if a feature flag is enabled for the current user.
 * A flag is active if:
 *   1. The flag is globally enabled, OR
 *   2. The user's email is in the flag's target list
 */
export function useFeatureFlag(flagKey: string) {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsEnabled(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        // Fetch the flag
        const { data: flag, error: flagError } = await supabase
          .from('feature_flags')
          .select('id, enabled')
          .eq('key', flagKey)
          .single();

        if (flagError || !flag) {
          setIsEnabled(false);
          setLoading(false);
          return;
        }

        // If globally enabled, done
        if (flag.enabled) {
          setIsEnabled(true);
          setLoading(false);
          return;
        }

        // Check if user is targeted
        const { data: target } = await supabase
          .from('feature_flag_targets')
          .select('id')
          .eq('flag_id', flag.id)
          .eq('email', user.email || '')
          .maybeSingle();

        setIsEnabled(!!target);
      } catch {
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [user, flagKey]);

  return { isEnabled, loading };
}

/**
 * Admin hook for managing all feature flags
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<(FeatureFlag & { targets: FeatureFlagTarget[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlags = async () => {
    try {
      const { data: flagsData, error: flagsError } = await supabase
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: true });

      if (flagsError) throw flagsError;

      const { data: targetsData } = await supabase
        .from('feature_flag_targets')
        .select('*');

      const flagsWithTargets = (flagsData || []).map(flag => ({
        ...flag,
        targets: (targetsData || []).filter(t => t.flag_id === flag.id),
      }));

      setFlags(flagsWithTargets);
    } catch (error) {
      console.error('Error fetching feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flagId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled })
      .eq('id', flagId);

    if (error) throw error;
    await fetchFlags();
  };

  const addTarget = async (flagId: string, email: string) => {
    const { error } = await supabase
      .from('feature_flag_targets')
      .insert({ flag_id: flagId, email: email.toLowerCase().trim() });

    if (error) throw error;
    await fetchFlags();
  };

  const removeTarget = async (targetId: string) => {
    const { error } = await supabase
      .from('feature_flag_targets')
      .delete()
      .eq('id', targetId);

    if (error) throw error;
    await fetchFlags();
  };

  const createFlag = async (key: string, name: string, description?: string) => {
    const { error } = await supabase
      .from('feature_flags')
      .insert({ key, name, description });

    if (error) throw error;
    await fetchFlags();
  };

  const deleteFlag = async (flagId: string) => {
    const { error } = await supabase
      .from('feature_flags')
      .delete()
      .eq('id', flagId);

    if (error) throw error;
    await fetchFlags();
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  return {
    flags,
    loading,
    toggleFlag,
    addTarget,
    removeTarget,
    createFlag,
    deleteFlag,
    refresh: fetchFlags,
  };
}
