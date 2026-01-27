import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CRM_SESSION_KEY = 'crm_session_token';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas em ms

export const useCRMAccess = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const storedToken = localStorage.getItem(CRM_SESSION_KEY);
    
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('crm_access_sessions')
        .select('expires_at')
        .eq('session_token', storedToken)
        .maybeSingle();

      if (error || !data) {
        localStorage.removeItem(CRM_SESSION_KEY);
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const expiresAt = new Date(data.expires_at);

      if (now < expiresAt) {
        setIsAuthenticated(true);
      } else {
        // Sessão expirada
        await supabase
          .from('crm_access_sessions')
          .delete()
          .eq('session_token', storedToken);
        localStorage.removeItem(CRM_SESSION_KEY);
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      localStorage.removeItem(CRM_SESSION_KEY);
    }

    setIsLoading(false);
  };

  const authenticate = async (password: string): Promise<boolean> => {
    const CRM_PASSWORD = 'financeirobnoads@gmail.com';
    
    if (password !== CRM_PASSWORD) {
      setAttempts(prev => prev + 1);
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return false;
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();

      const sessionData = {
        user_id: user.id,
        session_token: token,
        expires_at: expiresAt
      };

      const { error } = await supabase
        .from('crm_access_sessions')
        .insert(sessionData);

      if (error) {
        console.error('Erro ao criar sessão:', error);
        return false;
      }

      localStorage.setItem(CRM_SESSION_KEY, token);
      setIsAuthenticated(true);
      setAttempts(0);
      return true;
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return false;
    }
  };

  const logout = async () => {
    const token = localStorage.getItem(CRM_SESSION_KEY);
    
    if (token) {
      await supabase
        .from('crm_access_sessions')
        .delete()
        .eq('session_token', token);
    }

    localStorage.removeItem(CRM_SESSION_KEY);
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    isLoading,
    attempts,
    authenticate,
    logout
  };
};