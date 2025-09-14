import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/Auth/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ForgotPasswordModal } from '@/components/Auth/ForgotPasswordModal';
import { PasswordChangeModal } from '@/components/Auth/PasswordChangeModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import bnoadsLogonew from "@/assets/bnoads-logo-new.png";

const Auth = () => {
  const { user, loading, signIn } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [forcedPasswordChange, setForcedPasswordChange] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Verificar se é redefinição de senha
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setResetToken(token);
      setShowPasswordChange(true);
    }
  }, [searchParams]);

  // Verificar primeiro login após autenticação
  useEffect(() => {
    if (user) {
      checkFirstLogin();
    }
  }, [user]);

  const checkFirstLogin = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('primeiro_login')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.primeiro_login) {
        setForcedPasswordChange(true);
        setShowPasswordChange(true);
      }
    } catch (error) {
      console.error('Erro ao verificar primeiro login:', error);
    }
  };

  // Redirecionar se já estiver logado e não for primeiro login
  if (user && !forcedPasswordChange && !resetToken) {
    return <Navigate to="/" replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await signIn(formData.email, formData.password);
    if (!error) {
      // Verificação de primeiro login será feita no useEffect
    }
    setIsSubmitting(false);
  };

  const handlePasswordResetSuccess = async () => {
    if (resetToken) {
      // Lógica para redefinição via token será implementada
      toast({
        title: "Senha redefinida!",
        description: "Faça login com sua nova senha.",
      });
      setResetToken(null);
    } else {
      setForcedPasswordChange(false);
    }
    setShowPasswordChange(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={bnoadsLogonew} 
              alt="BNOads" 
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-2xl">Sistema BNOads</CardTitle>
          <CardDescription>
            Faça login para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Sua senha"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="link" 
              className="w-full text-sm text-muted-foreground"
              onClick={() => setShowForgotPassword(true)}
            >
              Esqueci minha senha
            </Button>
          </form>
        </CardContent>
      </Card>

      <ForgotPasswordModal 
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
      />

      <PasswordChangeModal 
        open={showPasswordChange}
        onOpenChange={setShowPasswordChange}
        onSuccess={handlePasswordResetSuccess}
        forced={forcedPasswordChange}
      />
    </div>
  );
};

export default Auth;