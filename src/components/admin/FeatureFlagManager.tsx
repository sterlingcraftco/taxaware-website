import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useFeatureFlags } from '@/hooks/useFeatureFlag';
import { toast } from 'sonner';
import {
  Flag,
  Plus,
  X,
  Users,
  Loader2,
  Mail,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export function FeatureFlagManager() {
  const { flags, loading, toggleFlag, addTarget, removeTarget, createFlag, deleteFlag } = useFeatureFlags();
  const [newEmails, setNewEmails] = useState<Record<string, string>>({});
  const [addingTarget, setAddingTarget] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());

  // New flag form
  const [showNewFlag, setShowNewFlag] = useState(false);
  const [newFlagKey, setNewFlagKey] = useState('');
  const [newFlagName, setNewFlagName] = useState('');
  const [newFlagDesc, setNewFlagDesc] = useState('');
  const [creatingFlag, setCreatingFlag] = useState(false);

  const handleToggle = async (flagId: string, enabled: boolean) => {
    try {
      await toggleFlag(flagId, enabled);
      toast.success(`Feature flag ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update feature flag');
    }
  };

  const handleAddTarget = async (flagId: string) => {
    const email = newEmails[flagId]?.trim();
    if (!email) return;

    setAddingTarget(flagId);
    try {
      await addTarget(flagId, email);
      setNewEmails(prev => ({ ...prev, [flagId]: '' }));
      toast.success(`Added ${email} to feature flag targets`);
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('This email is already added');
      } else {
        toast.error('Failed to add target');
      }
    } finally {
      setAddingTarget(null);
    }
  };

  const handleRemoveTarget = async (targetId: string) => {
    try {
      await removeTarget(targetId);
      toast.success('Target removed');
    } catch {
      toast.error('Failed to remove target');
    }
  };

  const handleCreateFlag = async () => {
    if (!newFlagKey || !newFlagName) return;
    setCreatingFlag(true);
    try {
      await createFlag(newFlagKey.toLowerCase().replace(/\s+/g, '_'), newFlagName, newFlagDesc);
      setNewFlagKey('');
      setNewFlagName('');
      setNewFlagDesc('');
      setShowNewFlag(false);
      toast.success('Feature flag created');
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('A flag with this key already exists');
      } else {
        toast.error('Failed to create feature flag');
      }
    } finally {
      setCreatingFlag(false);
    }
  };

  const handleDeleteFlag = async (flagId: string) => {
    try {
      await deleteFlag(flagId);
      toast.success('Feature flag deleted');
    } catch {
      toast.error('Failed to delete feature flag');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const toggleExpanded = (flagId: string) => {
    setExpandedFlags(prev => {
      const next = new Set(prev);
      if (next.has(flagId)) next.delete(flagId);
      else next.add(flagId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Feature Flags</h3>
          <p className="text-sm text-muted-foreground">
            Control feature availability globally or for specific users
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewFlag(!showNewFlag)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Flag
        </Button>
      </div>

      {/* New Flag Form */}
      {showNewFlag && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Key</Label>
                <Input
                  placeholder="e.g. new_feature"
                  value={newFlagKey}
                  onChange={e => setNewFlagKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g. New Feature"
                  value={newFlagName}
                  onChange={e => setNewFlagName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="Brief description of the feature"
                value={newFlagDesc}
                onChange={e => setNewFlagDesc(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowNewFlag(false)}>Cancel</Button>
              <Button onClick={handleCreateFlag} disabled={creatingFlag || !newFlagKey || !newFlagName}>
                {creatingFlag && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Flag
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flag List */}
      {flags.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Flag className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No feature flags configured</p>
          </CardContent>
        </Card>
      ) : (
        flags.map(flag => (
          <Card key={flag.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Flag className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">{flag.name}</CardTitle>
                    <CardDescription className="text-xs">
                      Key: <code className="bg-muted px-1 py-0.5 rounded">{flag.key}</code>
                      {flag.description && ` — ${flag.description}`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={(checked) => handleToggle(flag.id, checked)}
                    />
                    <Badge variant={flag.enabled ? 'default' : 'secondary'}>
                      {flag.enabled ? 'Global' : 'Off'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm(flag.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <Collapsible
              open={expandedFlags.has(flag.id)}
              onOpenChange={() => toggleExpanded(flag.id)}
            >
              <CardContent className="pt-0">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {flag.targets.length} targeted user{flag.targets.length !== 1 ? 's' : ''}
                    {!flag.enabled && flag.targets.length > 0 && (
                      <Badge variant="outline" className="text-xs">Active for targets only</Badge>
                    )}
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-3 space-y-3">
                  {/* Add email input */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Add user email..."
                        className="pl-9"
                        value={newEmails[flag.id] || ''}
                        onChange={e => setNewEmails(prev => ({ ...prev, [flag.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddTarget(flag.id)}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddTarget(flag.id)}
                      disabled={addingTarget === flag.id || !newEmails[flag.id]?.trim()}
                    >
                      {addingTarget === flag.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Target list */}
                  {flag.targets.length > 0 && (
                    <div className="space-y-1">
                      {flag.targets.map(target => (
                        <div
                          key={target.id}
                          className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50 text-sm"
                        >
                          <span className="truncate">{target.email}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => handleRemoveTarget(target.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </CardContent>
            </Collapsible>
          </Card>
        ))
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature Flag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this feature flag and all its targets. Features gated behind this flag will become inaccessible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDeleteFlag(deleteConfirm)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
