import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Search, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

interface ClickUpUser {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
}

interface ClickUpUserLinkProps {
  onLinked: () => void;
}

export default function ClickUpUserLink({ onLinked }: ClickUpUserLinkProps) {
  const { userData } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [availableUsers, setAvailableUsers] = useState<ClickUpUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [linking, setLinking] = useState(false);
  const [existingMapping, setExistingMapping] = useState<any>(null);

  useEffect(() => {
    checkExistingMapping();
  }, [userData?.email]);

  const checkExistingMapping = async () => {
    if (!userData?.email) return;

    try {
      const { data, error } = await supabase
        .from('clickup_user_mappings')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking mapping:', error);
        return;
      }

      if (data) {
        setExistingMapping(data);
      }
    } catch (error) {
      console.error('Error checking mapping:', error);
    }
  };

  const handleUserLookup = async () => {
    if (!userData?.email) {
      toast.error('Email do usuário não encontrado');
      return;
    }

    setLoading(true);
    setSearchResult(null);
    setAvailableUsers([]);

    try {
      const { data, error } = await supabase.functions.invoke('clickup-integration', {
        body: {
          action: 'userLookup',
          teamId: '90140307863', // Default team
          email: userData.email
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro na consulta');
      }

      setSearchResult(data);
      
      // Tratamento inteligente do resultado
      if (data?.found) {
        // Mensagens específicas baseadas no tipo de match
        if (data.matchType === 'exact_email') {
          toast.success(`✅ Usuário encontrado: ${data.user.username}`);
        } else if (data.matchType === 'alias_match') {
          toast.success(`✅ Correspondência encontrada por alias: ${data.matchedAlias} → ${data.user.username}`);
        } else if (data.matchType === 'similarity_match') {
          const percentage = Math.round(data.similarity * 100);
          toast.success(`🎯 Correspondência próxima encontrada: ${data.user.username} (${percentage}% similaridade)`);
        }
      } else {
        // Não encontrado - configurar opções manuais
        if (data?.availableUsers) {
          setAvailableUsers(data.availableUsers);
        }
        
        if (data?.searchedAliases) {
          toast.error(`❌ Usuário não encontrado. Aliases pesquisados: ${data.searchedAliases.join(', ')}`);
        } else {
          toast.error('❌ Usuário não encontrado no ClickUp');
        }
      }
    } catch (error: any) {
      console.error('Error looking up user:', error);
      toast.error('Erro ao buscar usuário no ClickUp');
      setSearchResult({
        found: false,
        message: 'api_error',
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkUser = async (user: ClickUpUser) => {
    setLinking(true);

    try {
      const { data, error } = await supabase.functions.invoke('clickup-integration', {
        body: {
          action: 'linkUser',
          clickupUserId: user.id,
          clickupUsername: user.username,
          clickupEmail: user.email,
          clickupProfilePicture: user.profilePicture,
          teamId: '90140307863'
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao vincular usuário');
      }

      if (data.success) {
        toast.success(`Vínculo confirmado com ${user.username}!`);
        checkExistingMapping();
        onLinked();
      } else {
        throw new Error(data.error || 'Falha ao vincular usuário');
      }
    } catch (error: any) {
      console.error('Error linking user:', error);
      toast.error(error.message || 'Erro ao vincular usuário');
    } finally {
      setLinking(false);
    }
  };

  const handleManualSelection = async () => {
    if (!selectedUser) return;

    const user = availableUsers.find(u => u.id === selectedUser);
    if (user) {
      await handleLinkUser(user);
    }
  };

  const renderUserCard = (user: ClickUpUser, actionButton: React.ReactNode) => (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
      <Avatar className="h-12 w-12">
        <AvatarImage src={user.profilePicture} alt={user.username} />
        <AvatarFallback>
          {user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <h4 className="font-medium">{user.username}</h4>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <Badge variant="outline" className="text-xs mt-1">
          ID: {user.id}
        </Badge>
      </div>
      
      {actionButton}
    </div>
  );

  // Se já há vínculo existente
  if (existingMapping) {
    return (
      <Card className="border-green-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            Usuário Vinculado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderUserCard(
            {
              id: existingMapping.clickup_user_id,
              username: existingMapping.clickup_username,
              email: existingMapping.clickup_email,
              profilePicture: existingMapping.clickup_profile_picture
            },
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Vinculado
            </Badge>
          )}
          
          <div className="mt-4 text-sm text-muted-foreground">
            ✅ Suas tarefas do ClickUp agora aparecerão automaticamente!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <User className="h-5 w-5" />
          Vínculo de Usuário ClickUp
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            Para carregar suas tarefas, precisamos encontrar seu usuário no ClickUp.
          </p>
          
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <strong className="text-sm">Seu email:</strong>
            <span className="text-sm">{userData?.email || 'Carregando...'}</span>
          </div>
        </div>

        <Button 
          onClick={handleUserLookup} 
          disabled={loading || !userData?.email}
          className="w-full"
        >
          <Search className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Verificando...' : 'Verificar no ClickUp'}
        </Button>

        {/* Resultado da busca */}
        {searchResult && (
          <div className="space-y-4">
            {searchResult.found ? (
              <div className="space-y-3">
                <Alert className="border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {searchResult.matchType === 'exact_email' && 'Usuário encontrado por email exato!'}
                    {searchResult.matchType === 'alias_match' && `Correspondência encontrada por alias: ${searchResult.matchedAlias}`}
                    {searchResult.matchType === 'similarity_match' && `Correspondência próxima (${Math.round(searchResult.similarity * 100)}% similaridade)`}
                    {!searchResult.matchType && 'Usuário encontrado no ClickUp!'}
                  </AlertDescription>
                </Alert>

                {renderUserCard(
                  searchResult.user,
                  <Button 
                    onClick={() => handleLinkUser(searchResult.user)}
                    disabled={linking}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {linking ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {linking ? 'Vinculando...' : 'Confirmar Vínculo'}
                  </Button>
                )}

                {/* Mostrar alternativas se houver */}
                {searchResult.alternatives && searchResult.alternatives.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Outras opções próximas:</h4>
                    <div className="space-y-2">
                      {searchResult.alternatives.map((alt: any) => (
                        <div key={alt.id} className="flex items-center justify-between text-xs">
                          <span>{alt.username} ({alt.email})</span>
                          <Badge variant="outline">{Math.round(alt.similarity * 100)}%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Usuário não encontrado no ClickUp com o email {userData?.email}
                    {searchResult?.searchedAliases && (
                      <div className="mt-2 text-xs">
                        Aliases pesquisados: {searchResult.searchedAliases.join(', ')}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>

                {availableUsers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Selecionar manualmente:</span>
                    </div>
                    
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha seu usuário do ClickUp" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <span>{user.username}</span>
                              <span className="text-muted-foreground text-xs">({user.email})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedUser && (
                      <Button 
                        onClick={handleManualSelection}
                        disabled={linking}
                        className="w-full"
                      >
                        {linking ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        {linking ? 'Vinculando...' : 'Confirmar Vínculo'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}