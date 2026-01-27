import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CurrentUserData {
  id?: string;
  user_id?: string;
  nome: string;
  email: string;
  avatar_url?: string;
}

export const useCurrentUser = () => {
  const [userData, setUserData] = useState<CurrentUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate loading
    if (loadedRef.current) return;
    
    const loadUserData = async () => {
      try {
        // Get user directly from supabase instead of useAuth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user?.id) {
          setUserData(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('colaboradores')
          .select('id, user_id, nome, email, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao carregar dados do usuário:', error);
          setUserData(null);
        } else if (data) {
          setUserData(data);
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        setUserData(null);
      } finally {
        loadedRef.current = true;
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  return { userData, loading };
};