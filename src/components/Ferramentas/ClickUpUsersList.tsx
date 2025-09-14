import { useState } from "react";
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
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [stats, setStats] = useState<{totalUsers: number, totalTeams: number}>({
    totalUsers: 0,
    totalTeams: 0
  });

  const handleListUsers = async () => {
    setLoading(true);
    
    try {
      console.log('Tentando listar usuários do ClickUp...');
      
      // Primeiro, tentar uma ação que sabemos que funciona (getTeams)
      console.log('Testando conexão com getTeams...');
      const { data: teamsData, error: teamsError } = await supabase.functions.invoke('clickup-integration', {
        body: {
          action: 'getTeams'
        }
      });
      
      console.log('Resposta getTeams:', { teamsData, teamsError });
      
      if (teamsError) {
        throw new Error('Erro de conexão com ClickUp: ' + teamsError.message);
      }
      
      // Agora tentar listar usuários
      console.log('Testando listAllUsers...');
      const { data, error } = await supabase.functions.invoke('clickup-integration', {
        body: {
          action: 'listAllUsers'
        }
      });

      console.log('Resposta da edge function:', { data, error });

      if (error) {
        console.error('Erro na edge function:', error);
        throw new Error(error.message || 'Erro ao listar usuários');
      }

      if (data?.success) {
        setUsers(data.users || []);
        setTeams(data.teams || []);
        setStats({
          totalUsers: data.totalUsers || 0,
          totalTeams: data.totalTeams || 0
        });
        toast.success(`✅ Encontrados ${data.totalUsers} usuários em ${data.totalTeams} times`);
      } else {
        console.error('Resposta de erro:', data);
        
        // Se listAllUsers não funcionar, vamos usar getTeams e extrair dados básicos
        if (teamsData?.teams) {
          console.log('Fallback: usando dados dos times');
          setTeams(teamsData.teams);
          setStats({
            totalUsers: 0,
            totalTeams: teamsData.teams.length
          });
          toast.info(`Teams encontrados: ${teamsData.teams.length}. A função listAllUsers pode precisar ser redeployada.`);
        } else {
          throw new Error(data?.error || 'Falha ao listar usuários');
        }
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
        <div className="flex gap-2">
          <Button 
            onClick={handleListUsers} 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
          <div className="text-center py-8 text-muted-foreground">
            Clique em "Listar Usuários" para buscar todos os usuários do ClickUp
          </div>
        )}
      </CardContent>
    </Card>
  );
}