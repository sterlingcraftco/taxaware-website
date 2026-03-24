import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePasskey } from '@/hooks/usePasskey';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Fingerprint, Plus, Pencil, Trash2, Loader2, Check, X, Smartphone } from 'lucide-react';
import { format } from 'date-fns';

interface Passkey {
  id: string;
  credential_id: string;
  name: string;
  device_type: string | null;
  backed_up: boolean | null;
  created_at: string;
}

export function PasskeyManager() {
  const { user } = useAuth();
  const { isSupported, loading: registering, registerPasskey } = usePasskey();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchPasskeys = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_passkeys')
        .select('id, credential_id, name, device_type, backed_up, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPasskeys((data as Passkey[]) || []);
    } catch {
      toast.error('Failed to load passkeys');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('user_passkeys')
        .update({ name: editName.trim() })
        .eq('id', id);

      if (error) throw error;
      setPasskeys(prev => prev.map(p => p.id === id ? { ...p, name: editName.trim() } : p));
      setEditingId(null);
      toast.success('Passkey renamed');
    } catch {
      toast.error('Failed to rename passkey');
    } finally {
      setSavingName(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('user_passkeys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPasskeys(prev => prev.filter(p => p.id !== id));
      toast.success('Passkey removed');
    } catch {
      toast.error('Failed to remove passkey');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async () => {
    const success = await registerPasskey(newPasskeyName || undefined);
    if (success) {
      setNewPasskeyName('');
      setShowAddForm(false);
      fetchPasskeys();
    }
  };

  if (!isSupported) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5" />
          Passkeys
        </CardTitle>
        <CardDescription>
          Manage passkeys for quick biometric sign-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {passkeys.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No passkeys registered yet. Add one for quick sign-in.
              </p>
            ) : (
              <div className="space-y-3">
                {passkeys.map((passkey) => (
                  <div
                    key={passkey.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="p-2 rounded-md bg-primary/10 shrink-0">
                      <Smartphone className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingId === passkey.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(passkey.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleRename(passkey.id)}
                            disabled={savingName}
                          >
                            {savingName ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium truncate">{passkey.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Added {format(new Date(passkey.created_at), 'MMM d, yyyy')}
                            {passkey.device_type && ` · ${passkey.device_type}`}
                          </p>
                        </>
                      )}
                    </div>
                    {editingId !== passkey.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingId(passkey.id);
                            setEditName(passkey.name);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(passkey.id)}
                          disabled={deletingId === passkey.id}
                        >
                          {deletingId === passkey.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showAddForm ? (
              <div className="flex items-center gap-2 pt-2">
                <Input
                  placeholder="Passkey name (e.g. iPhone, MacBook)"
                  value={newPasskeyName}
                  onChange={(e) => setNewPasskeyName(e.target.value)}
                  className="text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={registering}
                >
                  {registering ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Add'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewPasskeyName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-4 h-4" />
                Add Passkey
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
