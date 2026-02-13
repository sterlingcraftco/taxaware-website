import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  Shield,
  ShieldOff,
  Search,
  Loader2,
  Mail,
  Calendar,
  UserCheck,
  Crown,
  Eye,
  ArrowLeft,
  CreditCard,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface UserSubscription {
  id: string;
  plan: string;
  status: string;
  amount: number;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

interface UserWithRole {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  is_admin: boolean;
  subscription?: UserSubscription | null;
  tin: string | null;
  tax_residency: string | null;
}

const ITEMS_PER_PAGE = 15;

export function AdminUsersManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [actionType, setActionType] = useState<'promote' | 'demote' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [detailUser, setDetailUser] = useState<UserWithRole | null>(null);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, created_at, tin, tax_residency')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('*');

      if (subError) throw subError;

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);
      const subsByUser = new Map(subscriptions?.map(s => [s.user_id, s]) || []);

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        created_at: profile.created_at,
        is_admin: adminUserIds.has(profile.user_id),
        subscription: subsByUser.get(profile.user_id) as UserSubscription | null || null,
        tin: profile.tin,
        tax_residency: profile.tax_residency,
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleAction = (user: UserWithRole, action: 'promote' | 'demote') => {
    setSelectedUser(user);
    setActionType(action);
  };

  const confirmRoleAction = async () => {
    if (!selectedUser || !actionType) return;

    setProcessing(true);
    try {
      if (actionType === 'promote') {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.user_id, role: 'admin' });
        if (error) throw error;
        toast.success(`${selectedUser.full_name || selectedUser.email} is now an admin`);
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.user_id)
          .eq('role', 'admin');
        if (error) throw error;
        toast.success(`${selectedUser.full_name || selectedUser.email} is no longer an admin`);
      }
      await fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    } finally {
      setProcessing(false);
      setSelectedUser(null);
      setActionType(null);
    }
  };

  const handleUpdateSubscription = async (userId: string, plan: string, status: string) => {
    setUpdatingSubscription(true);
    try {
      const now = new Date();
      const periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

      const updateData: Record<string, unknown> = {
        user_id: userId,
        plan,
        status,
        amount: plan === 'annual' ? 5000 : 0,
        current_period_start: plan !== 'free' ? now.toISOString() : null,
        current_period_end: plan !== 'free' ? periodEnd.toISOString() : null,
        updated_at: now.toISOString(),
      };

      const { error } = await supabase
        .from('subscriptions')
        .upsert(updateData as any, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success('Subscription updated');
      await fetchUsers();
      // Update detail view
      const updated = users.find(u => u.user_id === userId);
      if (updated && detailUser?.user_id === userId) {
        setDetailUser({ ...updated });
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
    } finally {
      setUpdatingSubscription(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => setCurrentPage(page);

  const getVisiblePages = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const adminCount = users.filter(u => u.is_admin).length;
  const proCount = users.filter(u => u.subscription?.plan !== 'free' && u.subscription?.status === 'active').length;

  const getSubscriptionBadge = (sub?: UserSubscription | null) => {
    if (!sub || sub.plan === 'free') return <Badge variant="outline" className="text-xs">Free</Badge>;
    if (sub.status === 'active') return <Badge className="bg-primary/10 text-primary border-primary/20 text-xs"><Crown className="w-3 h-3 mr-1" />Pro</Badge>;
    return <Badge variant="secondary" className="text-xs">{sub.status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // User detail view
  if (detailUser) {
    const sub = users.find(u => u.user_id === detailUser.user_id)?.subscription;
    return (
      <div className="space-y-6">
        <Button variant="ghost" className="gap-2" onClick={() => setDetailUser(null)}>
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Button>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" /> Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium">{detailUser.full_name || 'Not set'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{detailUser.email || 'Not set'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">TIN</span>
                <span className="text-sm font-medium">{detailUser.tin || 'Not set'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tax Residency</span>
                <span className="text-sm font-medium">{detailUser.tax_residency || 'Not set'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Joined</span>
                <span className="text-sm font-medium">{format(new Date(detailUser.created_at), 'MMM d, yyyy')}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Role</span>
                {detailUser.is_admin ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20"><Shield className="w-3 h-3 mr-1" />Admin</Badge>
                ) : (
                  <Badge variant="outline"><UserCheck className="w-3 h-3 mr-1" />User</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscription Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" /> Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current Plan</span>
                {getSubscriptionBadge(sub)}
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-medium">₦{(sub?.amount || 0).toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Period Start</span>
                <span className="text-sm font-medium">
                  {sub?.current_period_start ? format(new Date(sub.current_period_start), 'MMM d, yyyy') : '—'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Period End</span>
                <span className="text-sm font-medium">
                  {sub?.current_period_end ? format(new Date(sub.current_period_end), 'MMM d, yyyy') : '—'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium capitalize">{sub?.status || 'active'}</span>
              </div>

              <Separator />

              <div className="pt-2 space-y-3">
                <p className="text-sm font-medium">Manage Subscription</p>
                <div className="flex gap-2">
                  {(!sub || sub.plan === 'free') ? (
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => handleUpdateSubscription(detailUser.user_id, 'annual', 'active')}
                      disabled={updatingSubscription}
                    >
                      {updatingSubscription ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />}
                      Activate Pro
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-destructive"
                        onClick={() => handleUpdateSubscription(detailUser.user_id, 'free', 'active')}
                        disabled={updatingSubscription}
                      >
                        {updatingSubscription ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Downgrade to Free
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{adminCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Subscribers</CardTitle>
            <Crown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage users, roles, and subscriptions</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow key={user.user_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailUser(user)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              {user.is_admin ? (
                                <Shield className="h-4 w-4 text-primary" />
                              ) : (
                                <Users className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="font-medium">{user.full_name || 'No name'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="text-sm">{user.email || 'No email'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getSubscriptionBadge(user.subscription)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span className="text-sm">{format(new Date(user.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.is_admin ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                              <Shield className="h-3 w-3 mr-1" />Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline"><UserCheck className="h-3 w-3 mr-1" />User</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" onClick={() => setDetailUser(user)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {user.is_admin ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/20 hover:bg-destructive/10"
                                onClick={() => handleRoleAction(user, 'demote')}
                              >
                                <ShieldOff className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-primary border-primary/20 hover:bg-primary/10"
                                onClick={() => handleRoleAction(user, 'promote')}
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {getVisiblePages().map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedUser && !!actionType} onOpenChange={() => {
        setSelectedUser(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'promote' ? 'Grant Admin Access?' : 'Remove Admin Access?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'promote' 
                ? `This will give ${selectedUser?.full_name || selectedUser?.email} full administrative access.`
                : `This will remove administrative privileges from ${selectedUser?.full_name || selectedUser?.email}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRoleAction}
              disabled={processing}
              className={actionType === 'promote' ? 'bg-primary hover:bg-primary/90' : 'bg-destructive hover:bg-destructive/90'}
            >
              {processing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
              ) : (
                actionType === 'promote' ? 'Grant Access' : 'Remove Access'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
