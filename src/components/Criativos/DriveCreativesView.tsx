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
  }, [clienteId, pagination.page, selectedType, searchTerm]);

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
      </div>

      {/* Tabela de Criativos */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : creatives.length === 0 ? (
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
                <TableHead className="w-12">Tipo</TableHead>
                <TableHead>Nome do Arquivo</TableHead>
                <TableHead className="w-32">Formato</TableHead>
                <TableHead className="w-24">Tamanho</TableHead>
                <TableHead className="w-32">Data Modificação</TableHead>
                <TableHead className="w-48">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creatives.map((creative) => (
                <TableRow key={creative.id} className="hover:bg-muted/50">
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
                  <TableCell>
                    <Badge className={`${getTipoColor(creative.mime_type)} text-xs`}>
                      {creative.type_display}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {creative.formatted_size}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {creative.formatted_date}
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