import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Search, 
  RefreshCw,
  Mail,
  Building,
  Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClickUpUser {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  teams: Array<{
    id: string;
    name: string;
  }>;
  teamsCount: number;
  primaryTeam: {
    id: string;
    name: string;
  };
}

interface ClickUpTeam {
  id: string;
  name: string;
}

export default function ClickUpUsersList() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<ClickUpUser[]>([]);
  const [teams, setTeams] = useState<ClickUpTeam[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("36694061");
  const [stats, setStats] = useState<{totalUsers: number, totalTeams: number}>({
    totalUsers: 0,
    totalTeams: 0
  });
  const [diagnostics, setDiagnostics] = useState<any[]>([]);

  // Carregar workspaces (teams) ao montar para permitir seleção antes da busca
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('clickup-integration', {
          body: { action: 'getTeams' }
        });
        if (!error && data?.teams) {
          const filtered = (data.teams as any[])
            .map((t: any) => ({ id: String(t.id), name: t.name }))
            .filter((t: any) => t.id === '36694061');
          const list = filtered.length > 0 ? filtered : [{ id: '36694061', name: 'BNO Ads' }];
          setTeams(list);
          setSelectedTeam('36694061');
          setStats((s) => ({ ...s, totalTeams: list.length }));
        }
      } catch (e) {
        console.warn('Falha ao carregar workspaces:', e);
        // fallback mínimo
        setTeams([{ id: '36694061', name: 'BNO Ads' }]);
        setSelectedTeam('36694061');
      }
    })();
  }, []);

  const handleListUsers = async () => {
    setLoading(true);
    
    try {
      console.log('Usando modo PRD para listar usuários do workspace:', selectedTeam);
      
      const { data, error } = await supabase.functions.invoke('clickup-integration', {
        body: {
          mode: 'listUsers',
          teamId: selectedTeam
        }
      });

      console.log('Resposta PRD:', { data, error });

      if (error) {
        console.error('Erro na edge function:', error);
        throw new Error(error.message || 'Erro ao listar usuários');
      }

      // Resposta conforme PRD
      if (data?.teamStatus && data.teamStatus >= 200 && data.teamStatus < 300) {
        const users = (data.users || []).map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          profilePicture: u.profilePicture,
          teams: [{ id: selectedTeam, name: 'BNO Ads' }],
          primaryTeam: { id: selectedTeam, name: 'BNO Ads' },
          teamsCount: 1,
        }));

        setUsers(users);
        setStats({
          totalUsers: data.counts?.users || 0,
          totalTeams: 1
        });

        const total = (data.counts?.users || 0) + (data.counts?.guests || 0);
        toast.success(`✅ Encontrados ${data.counts?.users || 0} usuários e ${data.counts?.guests || 0} convidados (total: ${total})`);
        
        // Registrar diagnóstico mesmo em sucesso
        setDiagnostics([
          {
            teamId: selectedTeam,
            teamName: 'BNO Ads',
            teamStatus: data?.teamStatus || 200,
            raw: data?.raw || {},
            diag: data?.diag
          }
        ]);
      } else {
        // Falha - exibir diagnóstico PRD
        setUsers([]);
        setStats({ totalUsers: 0, totalTeams: 1 });
        setDiagnostics([{
          teamId: selectedTeam,
          teamName: 'BNO Ads',
          teamStatus: data?.teamStatus || 'erro',
          raw: data?.raw || {},
          diag: data?.diag,
          error: data?.error || 'Falha na consulta'
        }]);
        toast.error(`❌ Falha ao listar usuários: ${data?.error || 'Status ' + data?.teamStatus}`);
      }
    } catch (error: any) {
      console.error('Error listing users:', error);
      
      // Diagnóstico mais detalhado
      if (error.message === 'Invalid action') {
        toast.error('Edge function não reconhece a ação listAllUsers. Pode precisar ser redeployada.');
      } else if (error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão com a edge function');
      } else {
        toast.error('Erro ao listar usuários do ClickUp: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtrar usuários baseado na busca e time selecionado
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTeam = !selectedTeam || 
      user.teams.some(team => team.id === selectedTeam);

    return matchesSearch && matchesTeam;
  });

  const renderUserCard = (user: ClickUpUser) => (
    <div key={user.id} className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.profilePicture} alt={user.username} />
          <AvatarFallback>
            {user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div>
            <h4 className="font-medium text-lg">{user.username}</h4>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span>{user.email}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Building className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium">Time principal:</span>
            <Badge variant="outline" className="text-xs">
              {user.primaryTeam.name}
            </Badge>
          </div>
          
          {user.teamsCount > 1 && (
            <div className="text-xs text-muted-foreground">
              + {user.teamsCount - 1} outro(s) time(s)
            </div>
          )}
          
          <div className="flex flex-wrap gap-1 mt-2">
            {user.teams.slice(0, 3).map(team => (
              <Badge key={team.id} variant="secondary" className="text-xs">
                {team.name}
              </Badge>
            ))}
            {user.teams.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{user.teams.length - 3} mais
              </Badge>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <strong>ID:</strong> {user.id}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Usuários do ClickUp
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-col sm:flex-row items-start">
          <div className="w-full sm:w-64">
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">Todos os workspaces</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <Button 
            onClick={handleListUsers} 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`${loading ? 'animate-spin' : ''} h-4 w-4 mr-2`} />
            {loading ? 'Carregando...' : 'Listar Usuários'}
          </Button>
        </div>

        {stats.totalUsers > 0 && (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              <strong>{stats.totalUsers}</strong> usuários encontrados em <strong>{stats.totalTeams}</strong> times
            </AlertDescription>
          </Alert>
        )}

        {users.length > 0 && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="w-full sm:w-48">
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Todos os times</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estatísticas dos filtros */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>
                Exibindo {filteredUsers.length} de {users.length} usuários
              </span>
            </div>

            {/* Lista de usuários */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(renderUserCard)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado com os filtros aplicados
                </div>
              )}
            </div>
          </div>
        )}

        {users.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground space-y-3">
            <div>
              {diagnostics.length > 0 ? "Nenhum usuário encontrado neste workspace" : "Clique em 'Listar Usuários' para buscar todos os usuários do ClickUp"}
            </div>
            {diagnostics.length > 0 && (
              <div className="text-left text-xs max-w-2xl mx-auto">
                {diagnostics.map((d, i) => (
                  <div key={i} className="rounded-md border p-3 mt-2 bg-muted/30">
                    <div className="font-medium mb-1">Diagnóstico PRD - Workspace {d.teamName} ({d.teamId})</div>
                    <div className="space-y-1">
                      <div><span className="font-semibold">Status Geral:</span> {d.teamStatus || ((d.diag?.user?.ok || d.diag?.guest?.ok) ? 'ok' : 'erro')}</div>
                      <div className="mt-1">
                        <div className="font-semibold">Endpoint /user:</div>
                        <div>URL: {d.diag?.user?.url || '—'}</div>
                        <div>Status: {d.diag?.user?.status ?? d.raw?.uStatus}</div>
                        {d.diag?.user?.bodyPreview && (
                          <div className="text-muted-foreground break-words">Preview: {d.diag.user.bodyPreview}</div>
                        )}
                      </div>
                      <div className="mt-1">
                        <div className="font-semibold">Endpoint /guest:</div>
                        <div>URL: {d.diag?.guest?.url || '—'}</div>
                        <div>Status: {d.diag?.guest?.status ?? d.raw?.gStatus} {((d.diag?.guest?.status ?? d.raw?.gStatus) === 404) ? '(endpoint não disponível)' : ''}</div>
                        {d.diag?.guest?.bodyPreview && (
                          <div className="text-muted-foreground break-words">Preview: {d.diag.guest.bodyPreview}</div>
                        )}
                      </div>
                      {d.error && <div className="text-destructive"><span className="font-semibold">Erro:</span> {d.error}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}