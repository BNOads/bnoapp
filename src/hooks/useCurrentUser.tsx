import { useState, useEffect } from "react";
import { useAuth } from "@/components/Auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CurrentUserData {
  id?: string;
  user_id?: string;
  nome: string;
  email: string;
  avatar_url?: string;
}

export const useCurrentUser = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<CurrentUserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('colaboradores')
          .select('id, user_id, nome, email, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao carregar dados do usuário:', error);
        } else if (data) {
          setUserData(data);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user?.id]);

  return { userData, loading };
};