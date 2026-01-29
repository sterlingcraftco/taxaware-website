import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const navigate = useNavigate();
  const { user, signInWithEmail, signUpWithEmail } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Validation error',
          description: err.errors[0].message,
        });
        return;
      }
    }

    setLoading(true);
    const { error } = await signInWithEmail(loginEmail, loginPassword);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.'
          : error.message,
      });
    }
    setLoading(false);
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Validation error',
          description: err.errors[0].message,
        });
        return;
      }
    }

    setLoading(true);
    const { error } = await signUpWithEmail(signupEmail, signupPassword, signupFullName);
    if (error) {
      let message = error.message;
      if (error.message.includes('already registered')) {
        message = 'This email is already registered. Please sign in instead.';
      }
      toast({
        variant: 'destructive',
        title: 'Sign up failed',
        description: message,
      });
    } else {
      toast({
        title: 'Account created!',
        description: 'You can now sign in with your credentials.',
      });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(forgotEmail);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Validation error',
          description: err.errors[0].message,
        });
        return;
      }
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      setResetEmailSent(true);
      toast({
        title: 'Check your email',
        description: 'We sent you a password reset link.',
      });
    }
    setLoading(false);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setResetEmailSent(false);
    setForgotEmail('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-primary/90 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-accent/20 backdrop-blur-sm">
              <Calculator className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-primary-foreground">NTA 2025 Calculator</h1>
          </div>
          <p className="text-primary-foreground/70">
            Sign in to save your calculations and track your tax over time
          </p>
        </div>

        <Card className="border-0 shadow-2xl">
          {showForgotPassword ? (
            <>
              <CardHeader className="text-center">
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                  {resetEmailSent 
                    ? "Check your email for the reset link"
                    : "Enter your email to receive a password reset link"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resetEmailSent ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                      <Mail className="w-12 h-12 mx-auto mb-3 text-green-500" />
                      <p className="text-sm font-medium text-green-600 mb-1">Email Sent!</p>
                      <p className="text-xs text-muted-foreground">
                        We've sent a password reset link to <strong>{forgotEmail}</strong>
                      </p>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      Didn't receive the email? Check your spam folder or try again.
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2" 
                      onClick={handleBackToLogin}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Sign In
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                    <Button 
                      type="button"
                      variant="ghost" 
                      className="w-full gap-2" 
                      onClick={handleBackToLogin}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Sign In
                    </Button>
                  </form>
                )}
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle>Welcome</CardTitle>
                <CardDescription>
                  Sign in to your account or create a new one
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login" className="space-y-4">
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-10"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password">Password</Label>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => setShowForgotPassword(true)}
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-password"
                            type={showLoginPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            tabIndex={-1}
                          >
                            {showLoginPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="signup" className="space-y-4">
                    <form onSubmit={handleEmailSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name (optional)</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="John Doe"
                            className="pl-10"
                            value={signupFullName}
                            onChange={(e) => setSignupFullName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-10"
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type={showSignupPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                            tabIndex={-1}
                          >
                            {showSignupPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 text-center">
                  <Button variant="link" onClick={() => navigate('/')}>
                    ← Back to Calculator
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
