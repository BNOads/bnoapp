import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CurrentUserData {
  id?: string;
  user_id?: string;
  nome: string;
  email: string;
  avatar_url?: string;
  nivel_acesso?: string;
  cargo_display?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  dono: "Dono",
  cs: "CS / Atendimento",
  gestor_trafego: "Gestor de Tráfego",
  webdesigner: "Web Designer",
  gestor_projetos: "Gestor de Projetos",
  editor_video: "Editor de Vídeo",
  copywriter: "Copywriter"
};

// Cache global para evitar múltiplas chamadas
let cachedUserData: CurrentUserData | null = null;
let cacheUserId: string | null = null;

export const useCurrentUser = () => {
  const [userData, setUserData] = useState<CurrentUserData | null>(cachedUserData);
  const [loading, setLoading] = useState(!cachedUserData);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.id) {
          if (mountedRef.current) {
            setUserData(null);
            setLoading(false);
          }
          return;
        }

        // Se já temos cache para este usuário, usar
        if (cachedUserData && cacheUserId === user.id) {
          if (mountedRef.current) {
            setUserData(cachedUserData);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from('colaboradores')
          .select('id, user_id, nome, email, avatar_url, nivel_acesso')
          .eq('user_id', user.id)
          .maybeSingle();

        if (mountedRef.current) {
          if (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            setUserData(null);
          } else if (data) {
            const enrichedData = {
              ...data,
              cargo_display: data.nivel_acesso ? ROLE_LABELS[data.nivel_acesso] || data.nivel_acesso : undefined
            };
            cachedUserData = enrichedData;
            cacheUserId = user.id;
            setUserData(enrichedData);
          } else {
            setUserData(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        if (mountedRef.current) {
          setUserData(null);
          setLoading(false);
        }
      }
    };

    loadUserData();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { userData, loading };
};