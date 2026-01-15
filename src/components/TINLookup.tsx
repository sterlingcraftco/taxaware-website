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
import { toast } from 'sonner';
import { Search, FileText, Loader2, Copy, CheckCircle } from 'lucide-react';

interface TINResponse {
  tin?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  lga?: string;
  error?: string;
  message?: string;
}

export default function TINLookup() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nin, setNin] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [result, setResult] = useState<TINResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nin || !firstName || !lastName || !dateOfBirth) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    setResult(null);

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

      if (data.error) {
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
    if (result?.tin) {
      await navigator.clipboard.writeText(result.tin);
      setCopied(true);
      toast.success('TIN copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setNin('');
    setFirstName('');
    setLastName('');
    setDateOfBirth('');
    setResult(null);
  };

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

      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            TIN Lookup
          </DialogTitle>
        </DialogHeader>

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

        {result && !result.error && result.tin && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-600">TIN Retrieved Successfully</p>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 p-3 bg-background rounded-md border">
                <p className="text-xs text-muted-foreground mb-1">Your TIN</p>
                <p className="font-mono text-lg font-semibold">{result.tin}</p>
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
            {result.firstName && result.lastName && (
              <p className="text-sm text-muted-foreground mt-3">
                Name: {result.firstName} {result.middleName || ''} {result.lastName}
              </p>
            )}
          </div>
        )}

        {result && result.error && (
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
