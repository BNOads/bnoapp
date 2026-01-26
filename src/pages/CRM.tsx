import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { CRMLoginModal } from '@/components/CRM/CRMLoginModal';
import { CRMBoard } from '@/components/CRM/CRMBoard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Helmet } from 'react-helmet';

const CRMPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { userData: user } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const token = localStorage.getItem('crm_session_token');
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('validate-crm-session', {
        body: { token }
      });

      if (error || !data?.valid) {
        localStorage.removeItem('crm_session_token');
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Error validating CRM session:', err);
      setIsAuthenticated(false);
    }
  };

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('crm_session_token', token);
    setIsAuthenticated(true);
  };

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {!isAuthenticated ? (
        <CRMLoginModal onLoginSuccess={handleLoginSuccess} />
      ) : (
        <CRMBoard readOnly={!user} />
      )}
    </div>
  );
};

export default CRMPage;