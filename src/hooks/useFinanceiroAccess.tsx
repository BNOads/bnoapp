import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FINANCEIRO_SESSION_KEY = 'financeiro_session_token';
const FINANCEIRO_PASSWORD = 'financeirobnoads@gmail.com';
const SESSION_DURATION_HOURS = 8;

export const useFinanceiroAccess = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const token = localStorage.getItem(FINANCEIRO_SESSION_KEY);
    
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('financeiro_access_sessions')
        .select('expires_at')
        .eq('session_token', token)
        .single();

      if (error || !data) {
        localStorage.removeItem(FINANCEIRO_SESSION_KEY);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const expiresAt = new Date(data.expires_at);
      const now = new Date();

      if (expiresAt > now) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem(FINANCEIRO_SESSION_KEY);
        await supabase
          .from('financeiro_access_sessions')
          .delete()
          .eq('session_token', token);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const authenticate = async (password: string): Promise<boolean> => {
    if (password === FINANCEIRO_PASSWORD) {
      const token = crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('financeiro_access_sessions')
          .insert({
            session_token: token,
            expires_at: expiresAt.toISOString(),
            user_id: user?.id
          });

        if (error) {
          console.error('Error creating session:', error);
          return false;
        }

        localStorage.setItem(FINANCEIRO_SESSION_KEY, token);
        setIsAuthenticated(true);
        setAttempts(0);
        return true;
      } catch (error) {
        console.error('Error authenticating:', error);
        return false;
      }
    } else {
      setAttempts(prev => prev + 1);
      return false;
    }
  };

  const logout = async () => {
    const token = localStorage.getItem(FINANCEIRO_SESSION_KEY);
    if (token) {
      await supabase
        .from('financeiro_access_sessions')
        .delete()
        .eq('session_token', token);
      
      localStorage.removeItem(FINANCEIRO_SESSION_KEY);
    }
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
