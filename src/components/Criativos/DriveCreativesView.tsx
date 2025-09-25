import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, FileImage, Video, FileText, File, ExternalLink, Clock, AlertCircle, CheckCircle, Copy, Calendar, ArrowUpDown, Edit2, ChevronUp, ChevronDown, Plus, Trash2, FolderOpen } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { EditarCriativoGoogleDriveModal } from "./EditarCriativoGoogleDriveModal";
import { EdicaoMassaCriativosModal } from "./EdicaoMassaCriativosModal";
import { NovoCriativoExternoModal } from "./NovoCriativoExternoModal";
import { CreativeTableSettings, type ColumnConfig } from "./CreativeTableSettings";
import { BulkLinksModal } from "./BulkLinksModal";

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
  observacao_personalizada?: string | null;
  nomenclatura_trafego?: string | null;
  pagina_destino?: string | null;
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
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'nomenclatura' | 'pagina_destino' | 'pasta' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [editingCreative, setEditingCreative] = useState<Creative | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [novoExternoModalOpen, setNovoExternoModalOpen] = useState(false);
  const [editingNomenclatura, setEditingNomenclatura] = useState<{ id: string; value: string } | null>(null);
  const [saveController, setSaveController] = useState<AbortController | null>(null);
  const [bulkLinksModalOpen, setBulkLinksModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [creativeToDelete, setCreativeToDelete] = useState<Creative | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'select', label: 'Seleção', visible: true, width: 'w-10 sm:w-12' },
    { id: 'status', label: 'Status', visible: true, width: 'w-24 sm:w-32' },
    { id: 'activated_at', label: 'Ativado em', visible: true, width: 'w-32' },
    { id: 'type', label: 'Tipo', visible: true, width: 'w-12' },
    { id: 'name', label: 'Nome do Arquivo', visible: true, width: 'min-w-[150px] lg:min-w-[200px]' },
    { id: 'pasta', label: 'Pasta', visible: true, width: 'w-32' },
    { id: 'date', label: 'Data Upload', visible: true, width: 'w-32' },
    { id: 'nomenclatura', label: 'Nomenclatura', visible: true, width: 'min-w-[150px]' },
    { id: 'observacao', label: 'Observação', visible: false, width: 'min-w-[150px]' },
    { id: 'pagina_destino', label: 'Página de Destino', visible: true, width: 'min-w-[200px]' }
  ]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const { toast } = useToast();

  // Load column preferences on mount
  useEffect(() => {
    const storageKey = `catalogo_colunas_${clienteId}`;
    try {
      const savedColumns = localStorage.getItem(storageKey);
      if (savedColumns) {
        const parsed = JSON.parse(savedColumns);
        setColumns(parsed);
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    }
  }, [clienteId]);

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

  // Filtrar e ordenar criativos
  const getFilteredAndSortedCreatives = () => {
    let filtered = selectedFolder === 'todas' 
      ? creatives 
      : creatives.filter(creative => 
          (creative.folder_name || 'Raiz') === selectedFolder
        );

    // Aplicar filtro de data
    if (dateFilter.start || dateFilter.end) {
      filtered = filtered.filter(creative => {
        const creativeDate = new Date(creative.modified_time);
        const startDate = dateFilter.start ? new Date(dateFilter.start) : null;
        const endDate = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59') : null;

        if (startDate && creativeDate < startDate) return false;
        if (endDate && creativeDate > endDate) return false;
        return true;
      });
    }

    // Aplicar ordenação
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.modified_time).getTime() - new Date(b.modified_time).getTime();
          break;
        case 'size':
          comparison = (a.file_size || 0) - (b.file_size || 0);
          break;
        case 'nomenclatura':
          comparison = (a.nomenclatura_trafego || '').localeCompare(b.nomenclatura_trafego || '');
          break;
        case 'pagina_destino':
          comparison = (a.pagina_destino || '').localeCompare(b.pagina_destino || '');
          break;
        case 'pasta':
          const folderA = a.folder_name || 'Raiz';
          const folderB = b.folder_name || 'Raiz';
          comparison = folderA.localeCompare(folderB);
          if (comparison === 0) {
            // Se as pastas são iguais, ordenar por nome
            comparison = a.name.localeCompare(b.name);
          }
          break;
        case 'status':
          const statusA = getCurrentStatus(a);
          const statusB = getCurrentStatus(b);
          comparison = statusA.localeCompare(statusB);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const filteredCreatives = getFilteredAndSortedCreatives();

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
      // Atualização otimística - atualizar estado local imediatamente
      setCreatives(prev => prev.map(creative => 
        creative.id === creativeId 
          ? { 
              ...creative, 
              status: newStatus,
              is_active: newStatus === 'ativo',
              activated_at: newStatus === 'ativo' ? new Date().toISOString() : null,
              activated_by: newStatus === 'ativo' ? 'current_user' : null
            }
          : creative
      ));

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

    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      
      // Em caso de erro, reverter a atualização otimística recarregando os dados
      await carregarCreatives();
      
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
      // Atualização otimística - atualizar estado local imediatamente
      setCreatives(prev => prev.map(creative => 
        selectedCreatives.includes(creative.id)
          ? { 
              ...creative, 
              status: action,
              is_active: action === 'ativo',
              activated_at: action === 'ativo' ? new Date().toISOString() : null,
              activated_by: action === 'ativo' ? 'current_user' : null
            }
          : creative
      ));

      // Executar atualizações no backend
      await Promise.all(
        selectedCreatives.map(async (creativeId) => {
          if (action !== 'ativo') {
            const { error } = await supabase
              .from('creatives')
              .update({
                is_active: false,
                activated_at: null,
                activated_by: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', creativeId);
            if (error) throw error;
          } else {
            const { data, error } = await supabase.rpc('update_creative_status', {
              creative_id: creativeId,
              new_status: true
            });
            if (error) throw error;
          }
        })
      );

      setSelectedCreatives([]);
      toast({
        title: "Ação em massa concluída",
        description: `${selectedCreatives.length} criativos atualizados para "${action}"`,
      });
    } catch (error) {
      console.error('Erro na ação em massa:', error);
      
      // Em caso de erro, recarregar dados para restaurar estado correto
      await carregarCreatives();
      setSelectedCreatives([]);
      
      toast({
        title: "Erro",
        description: "Erro ao executar ação em massa",
        variant: "destructive",
      });
    }
  };

  const handleToggleSort = (field: 'name' | 'date' | 'size' | 'nomenclatura' | 'pagina_destino' | 'pasta' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Handle bulk link opening
  const handleBulkOpenLinks = () => {
    const selectedCreativesData = filteredCreatives.filter(c => 
      selectedCreatives.includes(c.id) && c.link_web_view
    );
    
    if (selectedCreativesData.length === 0) {
      toast({
        title: "Nenhum link disponível",
        description: "Os criativos selecionados não possuem links para abrir.",
        variant: "destructive",
      });
      return;
    }
    
    setBulkLinksModalOpen(true);
  };

  const handleDeleteCreative = (creative: Creative) => {
    setCreativeToDelete(creative);
    setDeleteModalOpen(true);
  };

  const confirmDeleteCreative = async () => {
    if (!creativeToDelete) return;

    try {
      const { error } = await supabase
        .from('creatives')
        .update({ archived: true })
        .eq('id', creativeToDelete.id);

      if (error) throw error;

      // Remover o criativo da lista local
      setCreatives(prev => prev.filter(creative => creative.id !== creativeToDelete.id));

      toast({
        title: "Criativo excluído",
        description: "O criativo foi excluído com sucesso.",
      });

      setDeleteModalOpen(false);
      setCreativeToDelete(null);
    } catch (error: any) {
      console.error('Erro ao excluir criativo:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir criativo",
        variant: "destructive",
      });
    }
  };

  const handleEditCreative = (creative: Creative) => {
    setEditingCreative(creative);
    setEditModalOpen(true);
  };

  const handleEditSuccess = async (updatedCreative?: Creative) => {
    if (updatedCreative) {  
      // Atualização otimística com dados retornados
      setCreatives(prev => prev.map(creative => 
        creative.id === updatedCreative.id 
          ? { ...creative, ...updatedCreative }
          : creative
      ));
    } else {
      // Fallback: recarregar apenas se não tiver dados atualizados
      await carregarCreatives();
    }
    setEditingCreative(null);
    setEditModalOpen(false);
  };

  const handleNomenclaturaEdit = (creative: Creative) => {
    setEditingNomenclatura({
      id: creative.id,
      value: creative.nomenclatura_trafego || ''
    });
  };

  const saveNomenclatura = async (creativeId: string, value: string) => {
    try {
      // Verificar se já existe registro na tabela creatives
      const { data: existingCreative } = await supabase
        .from('creatives')
        .select('id')
        .eq('id', creativeId)
        .maybeSingle();

      if (existingCreative) {
        // Se existe, apenas atualizar
        const { error } = await supabase
          .from('creatives')
          .update({
            nomenclatura_trafego: value?.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', creativeId);

        if (error) throw error;
      } else {
        // Se não existe, buscar dados do Drive e inserir
        const creative = creatives.find(c => c.id === creativeId);
        if (!creative) {
          throw new Error('Criativo não encontrado na lista');
        }

        const { error } = await supabase
          .from('creatives')
          .insert({
            id: creativeId,
            file_id: creative.file_id,
            client_id: clienteId,
            name: creative.name,
            nomenclatura_trafego: value?.trim() || null,
            mime_type: creative.mime_type,
            link_web_view: creative.link_web_view,
            link_direct: creative.link_direct,
            file_size: creative.file_size,
            modified_time: creative.modified_time,
            folder_name: creative.folder_name,
            folder_path: creative.folder_path,
            parent_folder_id: creative.parent_folder_id,
            is_active: creative.is_active ?? true,
            archived: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      // Atualização otimística do estado local
      setCreatives(prev => prev.map(creative => 
        creative.id === creativeId 
          ? { ...creative, nomenclatura_trafego: value?.trim() || null }
          : creative
      ));

      toast({
        title: "✔️ Alteração salva",
        description: "Nomenclatura atualizada com sucesso!",
      });

    } catch (error: any) {
      console.error('Erro ao salvar nomenclatura:', error);
      toast({
        title: "Falha ao salvar",
        description: "Tente novamente.",
        variant: "destructive",
      });
      
      // Em caso de erro, recarregar para garantir consistência
      await carregarCreatives();
    }
  };

  const handleNomenclaturaBlur = async () => {
    if (!editingNomenclatura) return;
    
    // Cancelar request anterior se existir
    if (saveController) {
      saveController.abort();
    }

    // Debounce - aguardar um pouco antes de salvar
    const controller = new AbortController();
    setSaveController(controller);
    
    setTimeout(async () => {
      if (controller.signal.aborted) return;
      
      try {
        await saveNomenclatura(editingNomenclatura.id, editingNomenclatura.value);
        if (!controller.signal.aborted) {
          setEditingNomenclatura(null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Erro no save:', error);
        }
      } finally {
        setSaveController(null);
      }
    }, 300);
  };

  const handleNomenclaturaKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleNomenclaturaBlur();
    } else if (e.key === 'Escape') {
      // Cancelar qualquer save pendente
      if (saveController) {
        saveController.abort();
        setSaveController(null);
      }
      setEditingNomenclatura(null);
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-primary" /> : 
      <ChevronDown className="h-4 w-4 text-primary" />;
  };

  const SortableHeader = ({ field, children, className = "" }: { 
    field: 'name' | 'date' | 'size' | 'nomenclatura' | 'pagina_destino' | 'pasta' | 'status', 
    children: React.ReactNode,
    className?: string 
  }) => (
    <TableHead 
      className={`cursor-pointer select-none hover:bg-muted/50 ${className}`}
      onClick={() => handleToggleSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        {getSortIcon(field)}
      </div>
    </TableHead>
  );

  const isColumnVisible = (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    return column?.visible ?? true;
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
          
          <div className="flex items-center gap-2">
            <CreativeTableSettings
              columns={columns}
              onColumnsChange={setColumns}
              clienteId={clienteId}
            />
            
            <Button 
              variant="outline" 
              onClick={() => setNovoExternoModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Criativo Externo
            </Button>
            
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do arquivo..."
              className="pl-10 bg-background border-border text-sm lg:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
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
        </div>

        {/* Filtros de Data e Ordenação */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtro de Data:</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="date"
              placeholder="Data inicial"
              className="w-full sm:w-40"
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
            />
            <span className="hidden sm:block text-muted-foreground">até</span>
            <Input
              type="date"
              placeholder="Data final"
              className="w-full sm:w-40"
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Ordenar por:</span>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-') as [typeof sortBy, typeof sortOrder];
              setSortBy(field);
              setSortOrder(order);
            }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
                <SelectItem value="date-desc">Data (Mais recente)</SelectItem>
                <SelectItem value="date-asc">Data (Mais antigo)</SelectItem>
                <SelectItem value="size-desc">Tamanho (Maior)</SelectItem>
                <SelectItem value="size-asc">Tamanho (Menor)</SelectItem>
                <SelectItem value="pasta-asc">Pasta (A-Z)</SelectItem>
                <SelectItem value="pasta-desc">Pasta (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(dateFilter.start || dateFilter.end) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateFilter({ start: '', end: '' })}
              className="text-xs"
            >
              Limpar filtro
            </Button>
          )}
        </div>
      </div>

      {/* Botões de Ação em Massa */}
      {selectedCreatives.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">
            {selectedCreatives.length} selecionado(s):
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkOpenLinks}
            className="bg-purple-500/10 text-purple-700 border-purple-500/20 hover:bg-purple-500/20"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Abrir Links ({selectedCreatives.length})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBulkEditModalOpen(true)}
            className="bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20"
          >
            Editar Página de Destino
          </Button>
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedCreatives([])}
          >
            Limpar Seleção
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
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table 
              className="w-full"
              style={{ 
                tableLayout: 'auto',
                whiteSpace: 'normal',
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}
            >
            <TableHeader>
              <TableRow>
                {isColumnVisible('select') && (
                  <TableHead className="w-10 sm:w-12">
                    <Checkbox
                      checked={selectedCreatives.length === filteredCreatives.length && filteredCreatives.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                {isColumnVisible('status') && (
                  <SortableHeader field="status" className="w-24 sm:w-32">Status</SortableHeader>
                )}
                {isColumnVisible('activated_at') && (
                  <TableHead className="hidden lg:table-cell w-32">Ativado em</TableHead>
                )}
                {isColumnVisible('type') && (
                  <TableHead className="w-12">Tipo</TableHead>
                )}
                {isColumnVisible('name') && (
                  <SortableHeader field="name" className="min-w-[150px] lg:min-w-[200px]">
                    Nome do Arquivo
                  </SortableHeader>
                )}
                {isColumnVisible('pasta') && (
                  <SortableHeader field="pasta" className="hidden md:table-cell w-32">
                    Pasta
                  </SortableHeader>
                )}
                {isColumnVisible('date') && (
                  <SortableHeader field="date" className="hidden lg:table-cell w-32">
                    Data Upload
                  </SortableHeader>
                )}
                {isColumnVisible('nomenclatura') && (
                  <SortableHeader field="nomenclatura" className="min-w-[150px]">
                    Nomenclatura
                  </SortableHeader>
                )}
                {isColumnVisible('observacao') && (
                  <TableHead className="hidden xl:table-cell min-w-[150px]">Observação</TableHead>
                )}
                {isColumnVisible('pagina_destino') && (
                  <SortableHeader field="pagina_destino" className="hidden lg:table-cell min-w-[200px]">
                    Página de Destino
                  </SortableHeader>
                )}
               </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCreatives.map((creative) => (
                <TableRow 
                  key={creative.id} 
                  className={`hover:bg-muted/50 group transition-colors ${
                    selectedCreatives.includes(creative.id) ? 'bg-primary/5 hover:bg-primary/10' : ''
                  }`}
                >
                  {isColumnVisible('select') && (
                    <TableCell>
                      <Checkbox
                        checked={selectedCreatives.includes(creative.id)}
                        onCheckedChange={(checked) => handleSelectCreative(creative.id, checked as boolean)}
                      />
                    </TableCell>
                  )}
                  {isColumnVisible('status') && (
                    <TableCell>
                      <Select
                        value={getCurrentStatus(creative)}
                        onValueChange={(value: 'subir' | 'ativo' | 'inativo' | 'erro') => 
                          updateCreativeStatus(creative.id, value)
                        }
                      >
                        <SelectTrigger className="w-20 sm:w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="subir">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                              <span className="hidden sm:inline">Subir</span>
                              <span className="sm:hidden">S</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="ativo">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="hidden sm:inline">Ativo</span>
                              <span className="sm:hidden">A</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="inativo">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              <span className="hidden sm:inline">Inativo</span>
                              <span className="sm:hidden">I</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="erro">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-black"></div>
                              <span className="hidden sm:inline">Erro</span>
                              <span className="sm:hidden">E</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  {isColumnVisible('activated_at') && (
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
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
                  )}
                  {isColumnVisible('type') && (
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {getTipoIcon(creative.mime_type)}
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible('name') && (
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 lg:gap-3">
                          {creative.thumbnail_link && (
                            <img 
                              src={creative.thumbnail_link} 
                              alt={creative.name}
                              className="w-6 h-6 lg:w-8 lg:h-8 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <span 
                            className="text-xs lg:text-sm font-medium" 
                            title={creative.name}
                            style={{ 
                              wordWrap: 'break-word', 
                              wordBreak: 'break-word',
                              lineHeight: '1.2'
                            }}
                          >
                            {creative.name}
                          </span>
                        </div>
                        
                        {/* Actions under the name */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(creative.link_web_view, '_blank')}
                            className="h-5 w-5 p-0 action-icon"
                            title="Abrir criativo"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCreative(creative)}
                            className="h-5 w-5 p-0 action-icon"
                            title="Editar criativo"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(creative.link_direct, "Link direto")}
                            className="h-5 w-5 p-0 action-icon"
                            title="Copiar link"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {creative.folder_name && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFolder(creative.folder_name)}
                              className="h-5 w-5 p-0 action-icon"
                              title="Ver pasta"
                            >
                              <FolderOpen className="h-3 w-3" />
                            </Button>
                           )}
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleDeleteCreative(creative)}
                             className="h-5 w-5 p-0 action-icon text-red-600 hover:text-red-700"
                             title="Excluir criativo"
                           >
                             <Trash2 className="h-3 w-3" />
                           </Button>
                         </div>
                      </div>
                    </TableCell>
                  )}
                  {isColumnVisible('pasta') && (
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      <span 
                        className="truncate" 
                        title={creative.folder_path || creative.folder_name}
                        style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}
                      >
                        {creative.folder_name || 'Raiz'}
                      </span>
                    </TableCell>
                  )}
                  {isColumnVisible('date') && (
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      <div>
                        <div className="text-xs">{new Date(creative.modified_time).toLocaleDateString('pt-BR')}</div>
                        <div className="text-xs opacity-70">
                          {new Date(creative.modified_time).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </TableCell>
                  )}
                   {isColumnVisible('nomenclatura') && (
                     <TableCell>
                       <div className="flex items-center gap-2">
                         {editingNomenclatura?.id === creative.id ? (
                           <Input
                             value={editingNomenclatura.value}
                             onChange={(e) => setEditingNomenclatura({ ...editingNomenclatura, value: e.target.value })}
                             onBlur={handleNomenclaturaBlur}
                             onKeyDown={handleNomenclaturaKeyDown}
                             className="h-8 text-xs"
                             placeholder="Digite a nomenclatura..."
                             autoFocus
                           />
                         ) : (
                           <span 
                             className="text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded min-h-[2rem] flex items-center word-break-words" 
                             title={creative.nomenclatura_trafego || 'Clique para editar'}
                             onClick={() => handleNomenclaturaEdit(creative)}
                             style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}
                           >
                             {creative.nomenclatura_trafego || 'Clique para editar'}
                           </span>
                         )}
                       </div>
                     </TableCell>
                   )}
                   {isColumnVisible('observacao') && (
                     <TableCell className="hidden xl:table-cell">
                       <div className="flex items-start gap-2">
                         <span 
                           className="text-sm text-muted-foreground" 
                           title={creative.observacao_personalizada || ''}
                           style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}
                         >
                           {creative.observacao_personalizada || '-'}
                         </span>
                       </div>
                     </TableCell>
                   )}
                   {isColumnVisible('pagina_destino') && (
                     <TableCell className="hidden lg:table-cell">
                       <div className="flex items-center gap-2">
                         {creative.pagina_destino ? (
                           <div className="flex items-center gap-1">
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => window.open(creative.pagina_destino!, '_blank')}
                               className="h-7 px-2 text-xs"
                               title="Abrir página de destino"
                             >
                               <ExternalLink className="h-3 w-3 mr-1" />
                               Abrir
                             </Button>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => copyToClipboard(creative.pagina_destino!, "Página de destino")}
                               className="h-6 w-6 p-0"
                               title="Copiar URL"
                             >
                               <Copy className="h-3 w-3" />
                             </Button>
                           </div>
                         ) : (
                           <span className="text-sm text-muted-foreground">-</span>
                         )}
                       </div>
                     </TableCell>
                   )}
                  </TableRow>
               ))}
            </TableBody>
            </Table>
          </div>
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

       {/* Modal de Edição */}
      <EditarCriativoGoogleDriveModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        creative={editingCreative}
        onSuccess={handleEditSuccess}
      />

      <EdicaoMassaCriativosModal
        open={bulkEditModalOpen}
        onOpenChange={setBulkEditModalOpen}
        selectedIds={selectedCreatives}
        selectedCount={selectedCreatives.length}
        onSuccess={(updatedCreatives) => {
          if (updatedCreatives) {
            // Atualização otimística para edição em massa
            setCreatives(prev => prev.map(creative => {
              const updated = updatedCreatives.find(u => u.id === creative.id);
              return updated ? { ...creative, ...updated } : creative;
            }));
          } else {
            carregarCreatives();
          }
          setSelectedCreatives([]);
          setBulkEditModalOpen(false);
        }}
      />

       <NovoCriativoExternoModal
         open={novoExternoModalOpen}
         onOpenChange={setNovoExternoModalOpen}
         clienteId={clienteId}
         onSuccess={() => {
           carregarCreatives();
           setNovoExternoModalOpen(false);
         }}
       />
       
       <BulkLinksModal
         open={bulkLinksModalOpen}
         onOpenChange={setBulkLinksModalOpen}
         creatives={filteredCreatives.filter(c => 
           selectedCreatives.includes(c.id) && c.link_web_view
         )}
         onOpenLinks={() => {
           setSelectedCreatives([]);
           setBulkLinksModalOpen(false);
          }}
        />

        {/* Modal de Confirmação de Exclusão */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Tem certeza que deseja excluir o criativo "{creativeToDelete?.name}"?</p>
              <p className="text-sm text-muted-foreground">
                Esta ação não pode ser desfeita. O criativo será removido permanentemente do catálogo.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteCreative}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };