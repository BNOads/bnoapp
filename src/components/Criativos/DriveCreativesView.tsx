import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, FileImage, Video, FileText, File, ExternalLink, Clock, AlertCircle, CheckCircle, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface Creative {
  id: string;
  file_id: string;
  name: string;
  mime_type: string;
  link_web_view: string;
  link_direct: string;
  icon_link: string;
  thumbnail_link: string;
  file_size: number;
  modified_time: string;
  type_display: string;
  formatted_size: string;
  formatted_date: string;
  folder_name: string;
  folder_path: string;
  parent_folder_id: string;
  is_active: boolean;
  activated_at: string | null;
  activated_by: string | null;
  status?: 'subir' | 'ativo' | 'inativo' | 'erro';
  activated_user?: {
    nome: string;
  };
}

interface DriveCreativesViewProps {
  clienteId: string;
}

export const DriveCreativesView = ({ clienteId }: DriveCreativesViewProps) => {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("todos");
  const [selectedFolder, setSelectedFolder] = useState<string>("todas");
  const [selectedCreatives, setSelectedCreatives] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const { toast } = useToast();

  const carregarCreatives = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (selectedType && selectedType !== "todos") params.append('type', selectedType);
      if (searchTerm) params.append('q', searchTerm);
      
      // Fazer chamada HTTP direta para a edge function
      const response = await fetch(`https://tbdooscfrrkwfutkdjha.supabase.co/functions/v1/drive-creatives/${clienteId}?${params}`, {
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZG9vc2NmcnJrd2Z1dGtkamhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQwODIsImV4cCI6MjA3MTUzMDA4Mn0.yd988Fotgc9LIZi83NlGDTaeB4f8BNgr9TYJgye0Cqw`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao carregar criativos');
      }
      
      const data = await response.json();
      
      setCreatives(data.creatives || []);
      setPagination(data.pagination);
      setLastSync(data.lastSync);
      setSyncError(data.syncError);
      
    } catch (error: any) {
      console.error('Erro ao carregar criativos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar criativos do Google Drive",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sincronizarDrive = async () => {
    try {
      setSyncing(true);
      
      // Buscar dados do cliente primeiro
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('pasta_drive_url, auto_permission')
        .eq('id', clienteId)
        .single();
      
      if (clienteError) throw clienteError;
      if (!cliente?.pasta_drive_url) {
        throw new Error('URL da pasta do Google Drive não configurada para este cliente');
      }
      
      const { data, error } = await supabase.functions.invoke('drive-sync', {
        body: {
          clientId: clienteId,
          driveFolderUrl: cliente.pasta_drive_url,
          autoPermission: cliente.auto_permission,
          isSync: true
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: data.message || "Sincronização concluída com sucesso!",
      });
      
      // Recarregar a lista após sincronização
      await carregarCreatives();
      
    } catch (error: any) {
      console.error('Erro na sincronização:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao sincronizar com Google Drive",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    carregarCreatives();
  }, [clienteId, pagination.page, selectedType, selectedFolder, searchTerm]);

  // Função para obter subpastas únicas
  const getUniqueSubfolders = () => {
    const folders = creatives
      .map(creative => creative.folder_name || 'Raiz')
      .filter((folder, index, arr) => arr.indexOf(folder) === index)
      .sort();
    return folders;
  };

  // Filtrar criativos localmente por subpasta se necessário
  const filteredCreatives = selectedFolder === 'todas' 
    ? creatives 
    : creatives.filter(creative => 
        (creative.folder_name || 'Raiz') === selectedFolder
      );

  const getTipoIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return <FileImage className="h-5 w-5" />;
    if (mimeType?.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (mimeType === 'application/pdf') return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const getTipoColor = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (mimeType?.startsWith('video/')) return 'bg-red-500/10 text-red-600 border-red-500/20';
    if (mimeType === 'application/pdf') return 'bg-green-500/10 text-green-600 border-green-500/20';
    return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  };

  const formatarTempoRelativo = (data: string) => {
    const agora = new Date();
    const dataItem = new Date(data);
    const diffMs = agora.getTime() - dataItem.getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHoras < 1) return 'Agora mesmo';
    if (diffHoras < 24) return `${diffHoras}h atrás`;
    if (diffDias === 1) return 'Ontem';
    if (diffDias < 7) return `${diffDias} dias atrás`;
    return dataItem.toLocaleDateString('pt-BR');
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Link copiado!",
      description: `${type} copiado para a área de transferência`,
    });
  };

  const updateCreativeStatus = async (creativeId: string, newStatus: 'subir' | 'ativo' | 'inativo' | 'erro') => {
    try {
      // Se o status não for 'ativo', precisamos limpar os dados de ativação
      if (newStatus !== 'ativo') {
        // Atualizar diretamente na tabela para limpar activated_at e activated_by
        const { error: updateError } = await supabase
          .from('creatives')
          .update({
            is_active: false,
            activated_at: null,
            activated_by: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', creativeId);

        if (updateError) throw updateError;
      } else {
        // Se for ativo, usar a função RPC
        const { data, error } = await supabase.rpc('update_creative_status', {
          creative_id: creativeId,
          new_status: true
        });

        if (error) throw error;
      }

      toast({
        title: "Status atualizado",
        description: `Status alterado para ${newStatus}`,
      });

      // Recarregar a lista para refletir as alterações
      await carregarCreatives();

    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status do criativo",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (creative: Creative) => {
    const status = creative.status || (creative.is_active ? 'ativo' : 'subir');
    
    switch (status) {
      case 'subir':
        return <Badge className="bg-yellow-500 text-yellow-900 hover:bg-yellow-600">Subir</Badge>;
      case 'ativo':
        return <Badge className="bg-green-500 text-white hover:bg-green-600">Ativo</Badge>;
      case 'inativo':
        return <Badge className="bg-red-500 text-white hover:bg-red-600">Inativo</Badge>;
      case 'erro':
        return <Badge className="bg-black text-white hover:bg-gray-800">Erro</Badge>;
      default:
        return <Badge className="bg-yellow-500 text-yellow-900 hover:bg-yellow-600">Subir</Badge>;
    }
  };

  const getCurrentStatus = (creative: Creative): 'subir' | 'ativo' | 'inativo' | 'erro' => {
    return creative.status || (creative.is_active ? 'ativo' : 'subir');
  };

  // Funções de seleção em massa
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCreatives(filteredCreatives.map(creative => creative.id));
    } else {
      setSelectedCreatives([]);
    }
  };

  const handleSelectCreative = (creativeId: string, checked: boolean) => {
    if (checked) {
      setSelectedCreatives(prev => [...prev, creativeId]);
    } else {
      setSelectedCreatives(prev => prev.filter(id => id !== creativeId));
    }
  };

  const handleBulkAction = async (action: 'ativo' | 'inativo' | 'subir' | 'erro') => {
    if (selectedCreatives.length === 0) return;

    try {
      await Promise.all(
        selectedCreatives.map(creativeId => 
          updateCreativeStatus(creativeId, action)
        )
      );

      setSelectedCreatives([]);
      toast({
        title: "Ação em massa concluída",
        description: `${selectedCreatives.length} criativos atualizados para "${action}"`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao executar ação em massa",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Status de Sincronização */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground">Criativos do Google Drive</h3>
            <p className="text-muted-foreground text-sm lg:text-base">
              Materiais sincronizados automaticamente do Google Drive
            </p>
          </div>
          
          <Button 
            variant="outline" 
            onClick={sincronizarDrive}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>

        {/* Status da Sincronização */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {lastSync ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Última sincronização: {formatarTempoRelativo(lastSync)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Ainda não sincronizado</span>
            </div>
          )}
        </div>

        {/* Alerta de Erro */}
        {syncError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro na sincronização: {syncError}
              <br />
              <span className="text-xs mt-2 block">
                Verifique se a URL da pasta do Google Drive está correta e se a pasta está compartilhada publicamente ou com a conta do serviço.
              </span>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do arquivo..."
            className="pl-10 bg-background border-border text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="imagem">Imagens</SelectItem>
            <SelectItem value="video">Vídeos</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="documento">Documentos</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={selectedFolder} onValueChange={setSelectedFolder}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por funil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os funis</SelectItem>
            {getUniqueSubfolders().map((folder) => (
              <SelectItem key={folder} value={folder}>
                {folder}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Botões de Ação em Massa */}
      {selectedCreatives.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">
            {selectedCreatives.length} selecionado(s):
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction('ativo')}
            className="bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20"
          >
            Marcar como Ativo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction('inativo')}
            className="bg-red-500/10 text-red-700 border-red-500/20 hover:bg-red-500/20"
          >
            Marcar como Inativo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction('subir')}
            className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 hover:bg-yellow-500/20"
          >
            Marcar para Subir
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction('erro')}
            className="bg-black/10 text-gray-700 border-black/20 hover:bg-black/20"
          >
            Marcar como Erro
          </Button>
        </div>
      )}

      {/* Tabela de Criativos */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredCreatives.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Nenhum criativo encontrado. Clique em "Sincronizar" para carregar arquivos do Google Drive.
          </p>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedCreatives.length === filteredCreatives.length && filteredCreatives.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32">Ativado em</TableHead>
                <TableHead className="w-12">Tipo</TableHead>
                <TableHead>Nome do Arquivo</TableHead>
                <TableHead className="w-32">Pasta</TableHead>
                <TableHead className="w-32">Data Upload</TableHead>
                <TableHead className="w-48">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCreatives.map((creative) => (
                <TableRow key={creative.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedCreatives.includes(creative.id)}
                      onCheckedChange={(checked) => handleSelectCreative(creative.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={getCurrentStatus(creative)}
                      onValueChange={(value: 'subir' | 'ativo' | 'inativo' | 'erro') => 
                        updateCreativeStatus(creative.id, value)
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="subir">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            Subir
                          </div>
                        </SelectItem>
                        <SelectItem value="ativo">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            Ativo
                          </div>
                        </SelectItem>
                        <SelectItem value="inativo">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            Inativo
                          </div>
                        </SelectItem>
                        <SelectItem value="erro">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-black"></div>
                            Erro
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {creative.activated_at ? (
                      <div>
                        <div>{new Date(creative.activated_at).toLocaleDateString('pt-BR')}</div>
                        <div className="text-xs opacity-70">
                          {new Date(creative.activated_at).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        {creative.activated_user?.nome && (
                          <div className="text-xs opacity-60 mt-1">
                            por {creative.activated_user.nome}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      {getTipoIcon(creative.mime_type)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {creative.thumbnail_link && (
                        <img 
                          src={creative.thumbnail_link} 
                          alt={creative.name}
                          className="w-8 h-8 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span className="truncate max-w-xs" title={creative.name}>
                        {creative.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className="truncate" title={creative.folder_path || creative.folder_name}>
                      {creative.folder_name || 'Raiz'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>
                      <div>{new Date(creative.modified_time).toLocaleDateString('pt-BR')}</div>
                      <div className="text-xs opacity-70">
                        {new Date(creative.modified_time).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(creative.link_direct, "Link direto")}
                        className="h-8 w-8 p-0"
                        title="Copiar link direto"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(creative.link_web_view, "Link do Drive")}
                        className="h-8 px-3"
                        title="Copiar link do Drive"
                      >
                        Link
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => window.open(creative.link_web_view, '_blank')}
                        className="h-8 px-3"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} arquivos)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};