import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Search, FileText, Loader2, Copy, CheckCircle, Save, User, MapPin, Calendar, Hash } from 'lucide-react';

interface TINResponseData {
  dateOfBirth?: string;
  firstName?: string;
  lastName?: string;
  nin?: string;
  tax_id?: string;
  tax_residency?: string;
}

interface TINResponse {
  data?: TINResponseData;
  message?: string;
  status?: number;
  success?: boolean;
  error?: string;
}

export default function TINLookup() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nin, setNin] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [result, setResult] = useState<TINResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nin || !firstName || !lastName || !dateOfBirth) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    setResult(null);
    setSaved(false);

    try {
      const { data, error } = await supabase.functions.invoke('lookup-tin', {
        body: {
          nin,
          firstName,
          lastName,
          dateOfBirth,
        },
      });

      if (error) {
        console.error('Function error:', error);
        toast.error(error.message || 'Failed to retrieve TIN');
        return;
      }

      if (data.error || !data.success) {
        toast.error(data.error || data.message || 'TIN lookup failed');
        setResult(data);
        return;
      }

      setResult(data);
      toast.success('TIN retrieved successfully');
    } catch (error) {
      console.error('Error looking up TIN:', error);
      toast.error('An error occurred while looking up TIN');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTIN = async () => {
    if (result?.data?.tax_id) {
      await navigator.clipboard.writeText(result.data.tax_id);
      setCopied(true);
      toast.success('TIN copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveToProfile = async () => {
    if (!user || !result?.data) {
      toast.error('You must be logged in to save');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          tin: result.data.tax_id,
          nin: result.data.nin,
          tax_residency: result.data.tax_residency,
          date_of_birth: result.data.dateOfBirth,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Save error:', error);
        toast.error('Failed to save TIN to profile');
        return;
      }

      setSaved(true);
      toast.success('TIN saved to your profile');
    } catch (error) {
      console.error('Error saving TIN:', error);
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNin('');
    setFirstName('');
    setLastName('');
    setDateOfBirth('');
    setResult(null);
    setSaved(false);
  };

  const tinData = result?.data;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="p-3 rounded-lg bg-blue-500/10 w-fit mb-2">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <CardTitle>TIN Lookup</CardTitle>
            <CardDescription>
              Retrieve your Tax Identification Number using your NIN
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full gap-2">
              <Search className="w-4 h-4" />
              Look Up TIN
            </Button>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            TIN Lookup
          </DialogTitle>
        </DialogHeader>

        {!tinData && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nin">NIN (National Identification Number)</Label>
              <Input
                id="nin"
                type="text"
                placeholder="Enter your 11-digit NIN"
                value={nin}
                onChange={(e) => setNin(e.target.value)}
                maxLength={11}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Enter your first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Enter your last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Looking up...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Look Up TIN
                </>
              )}
            </Button>
          </form>
        )}

        {tinData && (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-green-600">TIN Retrieved Successfully</p>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              
              {/* TIN Display with Copy */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 p-3 bg-background rounded-md border">
                  <p className="text-xs text-muted-foreground mb-1">Your TIN</p>
                  <p className="font-mono text-lg font-semibold">{tinData.tax_id}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyTIN}
                  className="h-full aspect-square"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Details Grid */}
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 bg-background rounded-md border">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="font-medium">{tinData.firstName} {tinData.lastName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-background rounded-md border">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">NIN</p>
                    <p className="font-mono font-medium">{tinData.nin}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-background rounded-md border">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{tinData.dateOfBirth}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-background rounded-md border">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tax Residency</p>
                    <p className="font-medium">{tinData.tax_residency}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {user && !saved && (
                <Button 
                  onClick={handleSaveToProfile} 
                  className="w-full gap-2"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save to My Profile
                    </>
                  )}
                </Button>
              )}
              
              {saved && (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">Saved to your profile</span>
                </div>
              )}

              <Button 
                variant="outline" 
                onClick={resetForm}
                className="w-full"
              >
                Look Up Another TIN
              </Button>
            </div>
          </div>
        )}

        {result && result.error && !tinData && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm font-medium text-destructive">Lookup Failed</p>
            <p className="text-sm text-muted-foreground mt-1">
              {result.error || result.message || 'Unable to retrieve TIN. Please check your details and try again.'}
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          Your data is securely transmitted and not stored. This service uses the official NIMC/JTB verification system.
        </p>
      </DialogContent>
    </Dialog>
  );
}