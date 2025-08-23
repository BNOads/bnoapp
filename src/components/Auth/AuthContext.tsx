import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Configurar listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Criar perfil automaticamente quando usuário se registra
        if (event === 'SIGNED_IN' && session?.user) {
          // Verificar se é primeiro login (não tem perfil ainda)
          setTimeout(async () => {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            if (!existingProfile) {
              await createUserProfile(session.user);
            }
          }, 0);
        }
      }
    );

    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const createUserProfile = async (user: User) => {
    try {
      const userData = user.user_metadata;
      
      // Verificar se é email master primeiro
      const { data: masterEmail } = await supabase
        .from('master_emails')
        .select('email')
        .eq('email', user.email!)
        .maybeSingle();
      
      const isMaster = !!masterEmail;
      const nivelAcesso = isMaster ? 'admin' : 'cs';
      
      console.log('Criando perfil para:', user.email, 'Master:', isMaster);
      
      // Criar perfil básico
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          nome: userData.nome || user.email?.split('@')[0] || 'Usuário',
          email: user.email!,
          nivel_acesso: nivelAcesso
        });

      if (profileError) {
        console.error('Erro ao criar perfil:', profileError);
        return;
      }

      // Criar registro de colaborador
      const { error: colaboradorError } = await supabase
        .from('colaboradores')
        .insert({
          user_id: user.id,
          nome: userData.nome || user.email?.split('@')[0] || 'Usuário',
          email: user.email!,
          nivel_acesso: nivelAcesso
        });

      if (colaboradorError) {
        console.error('Erro ao criar colaborador:', colaboradorError);
      }

      toast({
        title: "Conta criada com sucesso!",
        description: isMaster ? "Bem-vindo, Administrador!" : "Bem-vindo ao sistema BNOads.",
      });
    } catch (error) {
      console.error('Erro ao criar perfil do usuário:', error);
    }
  };

  const signUp = async (email: string, password: string, nome: string) => {
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome: nome
          }
        }
      });

      if (error) {
        let errorMessage = 'Erro ao criar conta.';
        if (error.message.includes('already registered')) {
          errorMessage = 'Este email já está registrado.';
        } else if (error.message.includes('password')) {
          errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
        } else if (error.message.includes('email')) {
          errorMessage = 'Email inválido.';
        }
        
        toast({
          title: "Erro no cadastro",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar a conta.",
        });
      }

      return { error };
    } catch (error) {
      console.error('Erro no signup:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let errorMessage = 'Erro ao fazer login.';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos.';
        }
        
        toast({
          title: "Erro no login",
          description: errorMessage,
          variant: "destructive",
        });
      }

      return { error };
    } catch (error) {
      console.error('Erro no signin:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};