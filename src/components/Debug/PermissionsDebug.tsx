import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/Auth/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Bug } from "lucide-react";

export const PermissionsDebug = () => {
  const { user } = useAuth();
  const permissions = useUserPermissions();
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkPermissions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Verificar perfil diretamente
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Verificar colaborador
      const { data: colaborador, error: colaboradorError } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Verificar permissões de dados sensíveis
      const { data: permissoesDados, error: permissoesError } = await supabase
        .from('permissoes_dados_sensíveis')
        .select('*')
        .eq('user_id', user.id);

      // Verificar se é email master
      const { data: masterEmail, error: masterError } = await supabase
        .from('master_emails')
        .select('*')
        .eq('email', user.email!);

      setDebugData({
        user: {
          id: user.id,
          email: user.email,
        },
        profile: { data: profile, error: profileError },
        colaborador: { data: colaborador, error: colaboradorError },
        permissoesDados: { data: permissoesDados, error: permissoesError },
        masterEmail: { data: masterEmail, error: masterError },
        currentPermissions: permissions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro no debug:', error);
      setDebugData({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 mb-4 bg-yellow-50 border-yellow-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bug className="h-5 w-5 text-yellow-600" />
          <h3 className="font-semibold text-yellow-800">Debug - Permissões</h3>
        </div>
        <Button 
          onClick={checkPermissions} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Verificar
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <strong>Permissões Atuais:</strong>
          <div className="flex space-x-2 mt-1">
            <Badge variant={permissions.isAdmin ? "default" : "secondary"}>
              Admin: {permissions.isAdmin ? "SIM" : "NÃO"}
            </Badge>
            <Badge variant={permissions.canCreateContent ? "default" : "secondary"}>
              Pode Criar: {permissions.canCreateContent ? "SIM" : "NÃO"}
            </Badge>
            <Badge variant={permissions.loading ? "outline" : "default"}>
              Loading: {permissions.loading ? "SIM" : "NÃO"}
            </Badge>
          </div>
        </div>

        {debugData && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
            <pre>{JSON.stringify(debugData, null, 2)}</pre>
          </div>
        )}
      </div>
    </Card>
  );
};