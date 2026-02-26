import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Calendar, History, Download, Plus, Edit2, Eye, Trash2, Search, Filter, Users, TrendingUp, Power, GripVertical, RotateCcw, CheckCircle, Info, Rocket, ExternalLink, FileImage, Megaphone, Link2, Unlink } from "lucide-react";
import { CATEGORIAS_FUNIL, getCategoriaLabel, getCategoriaDescricao, getCategoriaCor } from "@/lib/orcamentoConstants";
import { OrcamentoDetalhesModal } from "@/components/Orcamento/OrcamentoDetalhesModal";
import { OrcamentoStatusToggle } from "./OrcamentoStatusToggle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useSearch } from "@/hooks/useSearch";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
interface OrcamentoFunil {
  id: string;
  nome_funil: string;
  valor_investimento: number;
  data_atualizacao: string;
  observacoes: string;
  created_by: string;
  active: boolean;
  sort_order: number;
  etapa_funil?: string;
  categoria_explicacao?: string;
  creative_count?: number;
  creatives_loading?: boolean;
  // Campos para lançamentos integrados
  isLancamento?: boolean;
  lancamento_id?: string;
  lancamento_link_publico?: string | null;
  lancamento_status?: string;
  linked_campaigns?: { id: string; name: string }[];
  manual_campaigns?: string[] | null;
  landing_page_url?: string | null;
}

// Componente card draggable
const SortableOrcamentoCard = ({
  orcamento,
  isEditMode,
  isPublicView,
  canManageBudgets,
  onEdit,
  onDelete,
  onHistorico,
  onDetalhes,
  onStatusChange,
  onEditCampaigns,
  onOpenCreatives,
  allCampaigns,
  formatarMoeda
}: {
  orcamento: OrcamentoFunil;
  isEditMode: boolean;
  isPublicView: boolean;
  canManageBudgets: boolean;
  onEdit: (o: OrcamentoFunil) => void;
  onDelete: (o: OrcamentoFunil) => void;
  onHistorico: (o: OrcamentoFunil) => void;
  onDetalhes: (o: OrcamentoFunil) => void;
  onStatusChange: (id: string, status: boolean) => void;
  onEditCampaigns: (orcamentoId: string, campaigns: { id: string; name: string }[]) => void;
  onOpenCreatives: (o: OrcamentoFunil) => void;
  allCampaigns: { id: string; name: string }[];
  formatarMoeda: (v: number) => string;
}) => {
  const [showCampaignEditor, setShowCampaignEditor] = useState(false);
  const [campaignSearch, setCampaignSearch] = useState("");
  const lancamentoUrl = orcamento.lancamento_link_publico
    ? `/lancamento/${orcamento.lancamento_link_publico}`
    : !isPublicView && orcamento.lancamento_id
      ? `/lancamentos/${orcamento.lancamento_id}`
      : null;

  const handleOpenLancamento = () => {
    if (!lancamentoUrl) return;
    window.open(lancamentoUrl, '_blank');
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: orcamento.id,
    disabled: orcamento.isLancamento
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`relative w-full transition-all cursor-pointer hover:shadow-md hover:border-primary/50 ${!orcamento.active ? 'opacity-60 grayscale-[0.4]' : ''} ${orcamento.isLancamento ? 'border-l-4 border-l-emerald-500' : ''}`}
      onClick={() => !isEditMode && (orcamento.isLancamento ? handleOpenLancamento() : onDetalhes(orcamento))}
    >
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
          <div className="flex items-start gap-2 flex-1">
            {isEditMode && canManageBudgets && !isPublicView && !orcamento.isLancamento && (
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none mt-1"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg font-semibold line-clamp-2 leading-tight">
                  {orcamento.nome_funil}
                </CardTitle>
                {!orcamento.active && (
                  <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                    Desativado
                  </Badge>
                )}
                {orcamento.isLancamento && (
                  <Badge className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center gap-1">
                    <Rocket className="h-3 w-3" />
                    Lançamento
                  </Badge>
                )}
              </div>
              {!orcamento.isLancamento && (
                <OrcamentoStatusToggle
                  orcamentoId={orcamento.id}
                  currentStatus={orcamento.active}
                  onStatusChange={(newStatus) => onStatusChange(orcamento.id, newStatus)}
                  disabled={isPublicView || !canManageBudgets}
                />
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0 self-end sm:self-start">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (orcamento.isLancamento) {
                  handleOpenLancamento();
                } else {
                  onDetalhes(orcamento);
                }
              }}
              disabled={orcamento.isLancamento && !lancamentoUrl}
              className="h-7 w-7 p-0 sm:h-8 sm:w-8"
              title={orcamento.isLancamento ? "Ver Lançamento" : "Ver detalhes"}
            >
              {orcamento.isLancamento ? <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
            </Button>
            {orcamento.landing_page_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(orcamento.landing_page_url!, '_blank');
                }}
                className="h-7 w-7 p-0 sm:h-8 sm:w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                title="Abrir Landing Page"
              >
                <Link2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCreatives(orcamento);
              }}
              className="h-7 w-7 p-0 sm:h-8 sm:w-8 text-primary hover:text-primary hover:bg-primary/10"
              title="Ver Criativos"
            >
              <FileImage className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            {!orcamento.isLancamento && (
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onHistorico(orcamento); }} className="h-7 w-7 p-0 sm:h-8 sm:w-8" title="Ver histórico">
                <History className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            )}
            {canManageBudgets && !isPublicView && !orcamento.isLancamento && (
              <>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(orcamento); }} className="h-7 w-7 p-0 sm:h-8 sm:w-8" title="Editar">
                  <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(orcamento); }} className="text-destructive hover:text-destructive h-7 w-7 p-0 sm:h-8 sm:w-8" title="Excluir">
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 sm:space-y-3">
          <div className={`text-xl sm:text-2xl lg:text-3xl font-bold break-all ${orcamento.active ? 'text-primary' : 'text-muted-foreground'
            }`}>
            {formatarMoeda(orcamento.valor_investimento)}
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Categoria Badge */}
            {orcamento.etapa_funil && (
              <Badge
                className="text-xs text-white border-0"
                style={{ backgroundColor: getCategoriaCor(orcamento.etapa_funil) }}
              >
                {getCategoriaLabel(orcamento.etapa_funil)}
              </Badge>
            )}

            {/* Creative Count Badge */}
            <div
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-full cursor-pointer hover:bg-muted transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCreatives(orcamento);
              }}
              title="Ver criativos"
            >
              <FileImage className="h-3.5 w-3.5" />
              {orcamento.creatives_loading ? (
                <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
              ) : (
                <span>{orcamento.creative_count || 0}</span>
              )}
            </div>

            {/* Linked Campaigns Badge - Click to Edit */}
            <Dialog open={showCampaignEditor} onOpenChange={setShowCampaignEditor}>
              <DialogTrigger asChild>
                <div
                  className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full cursor-pointer transition-colors ${orcamento.linked_campaigns && orcamento.linked_campaigns.length > 0
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                      : 'text-muted-foreground bg-muted/50 hover:bg-muted'
                    }`}
                  onClick={(e) => e.stopPropagation()}
                  title="Editar campanhas vinculadas"
                >
                  <Megaphone className="h-3.5 w-3.5" />
                  <span>{orcamento.linked_campaigns?.length || 0}</span>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle className="text-base">Campanhas vinculadas - {orcamento.nome_funil}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    placeholder="Buscar campanhas..."
                    value={campaignSearch}
                    onChange={(e) => setCampaignSearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <ScrollArea className="h-[300px] pr-2">
                    <div className="space-y-1">
                      {(allCampaigns || [])
                        .filter(c => !campaignSearch || c.name.toLowerCase().includes(campaignSearch.toLowerCase()))
                        .map(camp => {
                          const isLinked = orcamento.linked_campaigns?.some(lc => lc.id === camp.id) || false;
                          return (
                            <div
                              key={camp.id}
                              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/80 transition-colors ${isLinked ? 'bg-blue-50' : ''}`}
                              onClick={() => {
                                const currentLinked = orcamento.linked_campaigns || [];
                                if (isLinked) {
                                  onEditCampaigns(orcamento.id, currentLinked.filter(c => c.id !== camp.id));
                                } else {
                                  onEditCampaigns(orcamento.id, [...currentLinked, camp]);
                                }
                              }}
                            >
                              <Checkbox checked={isLinked} className="pointer-events-none" />
                              <span className="text-sm flex-1 truncate">{camp.name}</span>
                              {isLinked && <Link2 className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                            </div>
                          );
                        })}
                      {(allCampaigns || []).filter(c => !campaignSearch || c.name.toLowerCase().includes(campaignSearch.toLowerCase())).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma campanha encontrada</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Explicação da Categoria */}
          {(orcamento.categoria_explicacao || orcamento.etapa_funil) && (
            <div className="bg-muted/50 rounded-md p-2 sm:p-3">
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {orcamento.categoria_explicacao || getCategoriaDescricao(orcamento.etapa_funil || '')}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
            <span className="leading-tight">
              Atualizado em {format(new Date(orcamento.data_atualizacao), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>

          {orcamento.observacoes && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {orcamento.observacoes}
            </p>
          )}
        </div>
      </CardContent>
    </Card >
  );
};
interface HistoricoOrcamento {
  id: string;
  valor_anterior: number;
  valor_novo: number;
  motivo_alteracao: string;
  data_alteracao: string;
  alterado_por: string;
}
interface GestorOrcamento {
  gestor_nome: string;
  gestor_avatar?: string;
  gestor_user_id: string;
  total_clientes: number;
  total_orcamentos: number;
  total_investimento: number;
  funis: Array<{
    nome_funil: string;
    valor_investimento: number;
    cliente_nome: string;
  }>;
}
interface OrcamentoPorFunilProps {
  clienteId: string;
  isPublicView?: boolean;
  showGestorValues?: boolean;
}
export const OrcamentoPorFunil = ({
  clienteId,
  isPublicView = false,
  showGestorValues = true
}: OrcamentoPorFunilProps) => {
  const [orcamentos, setOrcamentos] = useState<OrcamentoFunil[]>([]);
  const [lancamentosData, setLancamentosData] = useState<any[]>([]);
  const [gestoresOrcamentos, setGestoresOrcamentos] = useState<GestorOrcamento[]>([]);
  const [historico, setHistorico] = useState<HistoricoOrcamento[]>([]);
  const [campaignsData, setCampaignsData] = useState<any[]>([]); // Campaigns for linking
  const [loading, setLoading] = useState(true);
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState("info");
  const [selectedOrcamento, setSelectedOrcamento] = useState<OrcamentoFunil | null>(null);
  const [selectedFunil, setSelectedFunil] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    nome_funil: "",
    valor_investimento: "",
    observacoes: "",
    etapa_funil: "distribuicao_conteudo",
    categoria_explicacao: "",
    landing_page_url: ""
  });
  const {
    toast
  } = useToast();
  const {
    isAdmin,
    canManageBudgets
  } = useUserPermissions();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Transformar lançamento em formato de orçamento para exibição integrada
  const transformarLancamentoParaOrcamento = (lancamento: any): OrcamentoFunil => ({
    id: `lancamento-${lancamento.id}`,
    nome_funil: lancamento.nome_lancamento,
    valor_investimento: Number(lancamento.investimento_total) || 0,
    data_atualizacao: lancamento.updated_at,
    observacoes: '',
    created_by: '',
    active: true,
    sort_order: -1,
    etapa_funil: 'lancamento',
    isLancamento: true,
    lancamento_id: lancamento.id,
    lancamento_link_publico: lancamento.link_publico || null,
    landing_page_url: null, // Lançamentos usam o link_publico acima
    lancamento_status: lancamento.status_lancamento,
  });

  // Helper to link campaigns
  // If manual_campaigns has campaign IDs saved, use them as source of truth
  // Otherwise, auto-link by name matching
  const linkCampaignsToItem = (item: OrcamentoFunil) => {
    const manual = item.manual_campaigns;

    // If manual list exists and has IDs, use it directly
    if (manual && Array.isArray(manual) && manual.length > 0) {
      const linked = campaignsData.filter((camp: any) => manual.includes(camp.id));
      return { ...item, linked_campaigns: linked };
    }

    // Fallback: auto-link by name matching
    if (!campaignsData || campaignsData.length === 0) return { ...item, linked_campaigns: [] };

    const funnelName = item.nome_funil?.toLowerCase() || "";
    if (!funnelName) return { ...item, linked_campaigns: [] };

    const funnelWords = funnelName.split(' ').filter((w: string) => w.length > 2);

    // Exact match
    let autoLinked = campaignsData.filter((camp: any) => camp.name.toLowerCase().includes(funnelName));

    // Fuzzy match (if no exact matches)
    if (autoLinked.length === 0) {
      autoLinked = campaignsData.filter((camp: any) => {
        const campaignName = camp.name.toLowerCase();
        let score = 0;
        funnelWords.forEach((word: string) => {
          if (campaignName.includes(word)) score += word.length;
        });
        return score > 2;
      });
    }

    return { ...item, linked_campaigns: autoLinked };
  };

  // Combinar orçamentos com lançamentos transformados
  const todosItens: OrcamentoFunil[] = [
    ...lancamentosData.map(transformarLancamentoParaOrcamento),
    ...orcamentos
  ].map(linkCampaignsToItem);

  // Carregar contagem de criativos para todos os itens
  useEffect(() => {
    if (todosItens.length > 0) {
      carregarContagemCriativos();
    }
  }, [orcamentos.length, lancamentosData.length]);

  const carregarContagemCriativos = async () => {
    try {
      const orcamentoIds = orcamentos.map(o => o.id);
      const lancamentoIds = lancamentosData.map(l => l.id);

      if (orcamentoIds.length === 0 && lancamentoIds.length === 0) return;

      let clientInstance = supabase;
      if (isPublicView) {
        const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
        clientInstance = createPublicSupabaseClient();
      }

      // Buscar pastas vinculadas a orçamentos
      const { data: orcLinks } = await clientInstance
        .from('orcamento_criativos')
        .select('orcamento_id, folder_name')
        .in('orcamento_id', orcamentoIds);

      // Buscar pastas vinculadas a lançamentos
      const { data: lancLinks } = await clientInstance
        .from('lancamento_criativos')
        .select('lancamento_id, folder_name')
        .in('lancamento_id', lancamentoIds);

      // Consolidar todas as pastas para buscar contagem de arquivos
      const allFolders = Array.from(new Set([
        ...(orcLinks?.map(l => l.folder_name) || []),
        ...(lancLinks?.map(l => l.folder_name) || [])
      ]));

      if (allFolders.length === 0) {
        setOrcamentos(prev => prev.map(o => ({ ...o, creative_count: 0, creatives_loading: false })));
        setLancamentosData(prev => prev.map(l => ({ ...l, creative_count: 0, creatives_loading: false })));
        return;
      }

      // Buscar contagem de criativos por pasta
      const { data: creativesCountData, error: countError } = await clientInstance
        .from('creatives')
        .select('folder_name')
        .eq('client_id', clienteId)
        .in('folder_name', allFolders);

      if (countError) throw countError;

      // Agrupar contagem por pasta
      const countsByFolder = (creativesCountData || []).reduce((acc: any, curr) => {
        acc[curr.folder_name] = (acc[curr.folder_name] || 0) + 1;
        return acc;
      }, {});

      // Atualizar orçamentos
      setOrcamentos(prev => prev.map(o => {
        const relevantFolders = orcLinks?.filter(l => l.orcamento_id === o.id).map(l => l.folder_name) || [];
        const count = relevantFolders.reduce((sum, folder) => sum + (countsByFolder[folder] || 0), 0);
        return { ...o, creative_count: count, creatives_loading: false };
      }));

      // Atualizar lançamentos
      setLancamentosData(prev => prev.map(l => {
        const relevantFolders = lancLinks?.filter(link => link.lancamento_id === l.id).map(link => link.folder_name) || [];
        const count = relevantFolders.reduce((sum, folder) => sum + (countsByFolder[folder] || 0), 0);
        return { ...l, creative_count: count, creatives_loading: false };
      }));

    } catch (error) {
      console.error('Erro ao carregar contagem de criativos:', error);
    }
  };

  // Hook de pesquisa
  const {
    searchTerm,
    setSearchTerm,
    filteredItems
  } = useSearch(todosItens, ['nome_funil', 'observacoes']);

  // Filtro por funil e status - ativos primeiro
  const orcamentosFiltrados = filteredItems
    .filter(orcamento => {
      // Lançamentos sempre passam filtro de funil quando "todos" ou categoria "lancamento"
      const matchFunil = selectedFunil === "todos" ||
        (orcamento.isLancamento && selectedFunil === "lancamento") ||
        (!orcamento.isLancamento && orcamento.nome_funil === selectedFunil);
      // Lançamentos sempre são considerados "ativos"
      const matchStatus = selectedStatus === "todos" ||
        orcamento.isLancamento ||
        (selectedStatus === "ativos" && orcamento.active) ||
        (selectedStatus === "desativados" && !orcamento.active);
      return matchFunil && matchStatus;
    })
    .sort((a, b) => {
      // Lançamentos primeiro, depois ativos, depois por sort_order
      if (a.isLancamento !== b.isLancamento) {
        return a.isLancamento ? -1 : 1;
      }
      if (a.active !== b.active) {
        return a.active ? -1 : 1;
      }
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

  // Lista única de funis para o filtro (incluindo lançamentos se houver)
  const funisUnicos = Array.from(new Set(todosItens.map(o => o.nome_funil))).sort();
  useEffect(() => {
    console.log('🚀 Iniciando carregamento - clienteId:', clienteId);
    carregarOrcamentos();
    carregarLancamentos();
    if (showGestorValues) {
      carregarOrcamentosGestores();
    }
  }, [clienteId, showGestorValues]);
  const carregarOrcamentos = async () => {
    try {
      let clientInstance = supabase;
      if (isPublicView) {
        const {
          createPublicSupabaseClient
        } = await import('@/lib/supabase-public');
        clientInstance = createPublicSupabaseClient();
      }
      const {
        data,
        error
      } = await clientInstance
        .from('orcamentos_funil')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalized = (data || []).map((row: any) => ({
        ...row,
        active: row.active ?? row.ativo ?? true,
        sort_order: row.sort_order ?? 0,
      }));

      setOrcamentos(normalized);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar orçamentos: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarLancamentos = async () => {
    try {
      let clientInstance = supabase;
      if (isPublicView) {
        const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
        clientInstance = createPublicSupabaseClient();
      }

      const { data, error } = await clientInstance
        .from('lancamentos')
        .select('id, nome_lancamento, investimento_total, status_lancamento, updated_at, link_publico')
        .eq('cliente_id', clienteId)
        .eq('ativo', true)
        .in('status_lancamento', ['em_captacao', 'cpl', 'remarketing', 'pausado']);

      if (error) throw error;
      setLancamentosData(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar lançamentos:', error);
    }
  };

  const carregarCampanhasDoCliente = async () => {
    try {
      let clientInstance = supabase;
      if (isPublicView) {
        const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
        clientInstance = createPublicSupabaseClient();
      }

      // 1. Fetch Linked Accounts
      const { data: fetchedAccounts, error: accountsError } = await clientInstance
        .from('meta_client_ad_accounts')
        .select('id, account_name, ad_account_id')
        .eq('cliente_id', clienteId);

      if (accountsError || !fetchedAccounts || fetchedAccounts.length === 0) return;

      const accountUuids = fetchedAccounts.map(a => a.id);

      // 2. Fetch Unique Campaigns (last 90 days to verify active ones)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: insights, error } = await clientInstance
        .from('meta_campaign_insights')
        .select('campaign_id, campaign_name, date_start')
        .in('ad_account_id', accountUuids)
        .gte('date_start', ninetyDaysAgo.toISOString().split('T')[0]);

      if (error) {
        console.error("Error fetching campaigns:", error);
        return;
      }

      // Deduplicate based on ID, taking the latest name
      const uniqueCampaignsMap = new Map();
      insights?.forEach((item: any) => {
        // Always overwrite to get latest name maybe? Or first?
        // Generally newer dates are later in the response or we can sort.
        // Let's just take the first occurrence or last.
        // Actually insights might have multiple entries.
        if (!uniqueCampaignsMap.has(item.campaign_id)) {
          uniqueCampaignsMap.set(item.campaign_id, { id: item.campaign_id, name: item.campaign_name });
        }
      });

      setCampaignsData(Array.from(uniqueCampaignsMap.values()));

    } catch (error) {
      console.error("Error loading client campaigns:", error);
    }
  };

  useEffect(() => {
    carregarCampanhasDoCliente();
  }, [clienteId]);




  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Ignorar se algum dos itens for um lançamento
    const activeItem = orcamentosFiltrados.find(o => o.id === active.id);
    const overItem = orcamentosFiltrados.find(o => o.id === over.id);
    if (activeItem?.isLancamento || overItem?.isLancamento) return;

    // Filtrar apenas orçamentos (não lançamentos) para reordenação
    const orcamentosParaReordenar = orcamentosFiltrados.filter(o => !o.isLancamento);
    const oldIndex = orcamentosParaReordenar.findIndex(o => o.id === active.id);
    const newIndex = orcamentosParaReordenar.findIndex(o => o.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(orcamentosParaReordenar, oldIndex, newIndex);

    // Atualizar ordem otimista
    const updates = reordered.map((o, idx) => ({
      ...o,
      sort_order: idx
    }));

    setOrcamentos(prev => {
      const newOrcamentos = [...prev];
      updates.forEach(u => {
        const index = newOrcamentos.findIndex(o => o.id === u.id);
        if (index !== -1) {
          newOrcamentos[index] = u;
        }
      });
      return newOrcamentos;
    });

    // Salvar no backend com debounce
    try {
      const promises = updates.map(o =>
        supabase
          .from('orcamentos_funil')
          .update({ sort_order: o.sort_order })
          .eq('id', o.id)
      );

      await Promise.all(promises);

      toast({
        title: "Ordem salva",
        description: "A ordem dos orçamentos foi atualizada!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao salvar ordem: " + error.message,
        variant: "destructive",
      });
      carregarOrcamentos(); // Rollback
    }
  };

  const resetOrder = async () => {
    try {
      const updates = orcamentos.map((o, idx) => ({
        id: o.id,
        sort_order: idx
      }));

      const promises = updates.map(u =>
        supabase
          .from('orcamentos_funil')
          .update({ sort_order: u.sort_order })
          .eq('id', u.id)
      );

      await Promise.all(promises);
      await carregarOrcamentos();

      toast({
        title: "Ordem redefinida",
        description: "A ordem foi restaurada ao padrão!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao redefinir ordem: " + error.message,
        variant: "destructive",
      });
    }
  };
  const carregarOrcamentosGestores = async () => {
    console.log('🔄 Carregando orçamentos dos gestores...');
    try {
      const {
        data: rawData,
        error: rawError
      } = await supabase.from('clientes').select(`
          id,
          nome,
          primary_gestor_user_id
        `).eq('ativo', true).not('primary_gestor_user_id', 'is', null);
      if (rawError) throw rawError;
      console.log('📊 Clientes encontrados:', rawData?.length);
      const {
        data: colaboradores,
        error: colabError
      } = await supabase.from('colaboradores').select('user_id, nome, avatar_url').eq('ativo', true);
      if (colabError) throw colabError;
      console.log('👥 Colaboradores encontrados:', colaboradores?.length);
      const {
        data: orcamentos,
        error: orcError
      } = await supabase
        .from('orcamentos_funil')
        .select('cliente_id, nome_funil, valor_investimento, active, ativo');
      if (orcError) throw orcError;
      console.log('💰 Orçamentos encontrados:', orcamentos?.length);

      const gestoresMap = new Map<string, GestorOrcamento>();
      rawData?.forEach(cliente => {
        const colaborador = colaboradores?.find(c => c.user_id === cliente.primary_gestor_user_id);
        if (!colaborador) return;
        const gestorId = cliente.primary_gestor_user_id;
        if (!gestoresMap.has(gestorId)) {
          gestoresMap.set(gestorId, {
            gestor_nome: colaborador.nome,
            gestor_avatar: colaborador.avatar_url,
            gestor_user_id: gestorId,
            total_clientes: 0,
            total_orcamentos: 0,
            total_investimento: 0,
            funis: []
          });
        }
        const gestor = gestoresMap.get(gestorId)!;
        gestor.total_clientes++;
        const clienteOrcamentos = (orcamentos || []).filter(o => o.cliente_id === cliente.id) as any[];
        clienteOrcamentos.forEach(orcamento => {
          const isActive = (orcamento as any).active ?? (orcamento as any).ativo ?? true;
          if (isActive) {
            gestor.total_orcamentos++;
            gestor.total_investimento += Number((orcamento as any).valor_investimento);
          }
          gestor.funis.push({
            nome_funil: (orcamento as any).nome_funil,
            valor_investimento: Number((orcamento as any).valor_investimento),
            cliente_nome: cliente.nome
          });
        });
      });
      console.log('📈 Gestores processados:', Array.from(gestoresMap.values()));
      setGestoresOrcamentos(Array.from(gestoresMap.values()));
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos gestores: " + error.message,
        variant: "destructive"
      });
    }
  };
  const carregarHistorico = async (orcamentoId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from('historico_orcamentos').select('*').eq('orcamento_id', orcamentoId).order('data_alteracao', {
        ascending: false
      });
      if (error) throw error;
      setHistorico(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico: " + error.message,
        variant: "destructive"
      });
    }
  };
  const salvarOrcamento = async () => {
    try {
      const valor = parseFloat(formData.valor_investimento);
      if (isNaN(valor)) {
        toast({
          title: "Erro",
          description: "Valor do investimento deve ser um número válido",
          variant: "destructive"
        });
        return;
      }
      if (selectedOrcamento) {
        // Editar existente
        const {
          error
        } = await supabase.from('orcamentos_funil').update({
          nome_funil: formData.nome_funil,
          valor_investimento: valor,
          observacoes: formData.observacoes,
          etapa_funil: formData.etapa_funil,
          categoria_explicacao: formData.categoria_explicacao || null,
          landing_page_url: formData.landing_page_url || null,
          data_atualizacao: new Date().toISOString()
        }).eq('id', selectedOrcamento.id);
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Orçamento atualizado com sucesso!"
        });
        setShowEditarModal(false);
      } else {
        // Criar novo - orçamentos são criados ativos por padrão
        const { data: authData } = await supabase.auth.getUser();
        const actorUserId = authData.user?.id || null;
        const {
          data: novoOrcamento,
          error
        } = await supabase.from('orcamentos_funil').insert({
          cliente_id: clienteId,
          nome_funil: formData.nome_funil,
          valor_investimento: valor,
          observacoes: formData.observacoes,
          etapa_funil: formData.etapa_funil,
          categoria_explicacao: formData.categoria_explicacao || null,
          landing_page_url: formData.landing_page_url || null,
          active: true,
          created_by: actorUserId
        }).select('id, cliente_id, nome_funil, valor_investimento, active, etapa_funil').single();
        if (error) throw error;

        try {
          const { data: clienteData, error: clienteError } = await supabase
            .from('clientes')
            .select('id, nome, traffic_manager_id, cs_id, primary_gestor_user_id, primary_cs_user_id')
            .eq('id', clienteId)
            .maybeSingle();

          if (clienteError) {
            console.error('Erro ao buscar cliente para automação de orçamento:', clienteError);
          } else {
            await supabase.functions.invoke('evaluate-automations', {
              body: {
                trigger_type: 'new_budget',
                data: {
                  cliente: clienteData,
                  funil: {
                    id: novoOrcamento.id,
                    nome: novoOrcamento.nome_funil,
                    orcamento: novoOrcamento.valor_investimento,
                    status: novoOrcamento.active ? 'ativo' : 'inativo',
                    etapa_funil: novoOrcamento.etapa_funil,
                  },
                  orcamento: novoOrcamento,
                  user_id: actorUserId,
                },
              },
            });
          }
        } catch (automationError) {
          console.error('Erro ao disparar automações de novo orçamento:', automationError);
        }

        toast({
          title: "Sucesso",
          description: "Orçamento criado com sucesso!"
        });
        setShowNovoModal(false);
      }
      setFormData({
        nome_funil: "",
        valor_investimento: "",
        observacoes: "",
        etapa_funil: "distribuicao_conteudo",
        categoria_explicacao: "",
        landing_page_url: ""
      });
      setSelectedOrcamento(null);
      carregarOrcamentos();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao salvar orçamento: " + error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditCampaigns = async (orcamentoId: string, newLinkedCampaigns: { id: string; name: string }[]) => {
    const campaignIds = newLinkedCampaigns.map(c => c.id);

    const { error } = await supabase
      .from('orcamentos_funil')
      .update({ manual_campaigns: campaignIds, updated_at: new Date().toISOString() })
      .eq('id', orcamentoId);

    if (error) {
      console.error('Error saving manual campaigns:', error);
      toast({ title: "Erro", description: "Falha ao salvar campanhas vinculadas.", variant: "destructive" });
      return;
    }

    setOrcamentos(prev => prev.map(o =>
      o.id === orcamentoId ? { ...o, manual_campaigns: campaignIds } : o
    ));
  };

  const handleStatusChange = async (orcamentoId: string, newStatus: boolean) => {
    // 1. Update local state immediately for responsiveness
    setOrcamentos(prev => prev.map(o =>
      o.id === orcamentoId ? { ...o, active: newStatus } : o
    ));

    // 2. Find the budget to get linked campaigns (use todosItens which has linked_campaigns populated)
    const orcamento = todosItens.find(o => o.id === orcamentoId);

    // 2.1 Trigger automations for funnel status change
    if (orcamento && !orcamento.isLancamento) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const actorUserId = authData.user?.id || null;
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .select('id, nome, traffic_manager_id, cs_id, primary_gestor_user_id, primary_cs_user_id')
          .eq('id', clienteId)
          .maybeSingle();

        if (clienteError) {
          console.error('Erro ao buscar cliente para automação de funil:', clienteError);
        } else {
          await supabase.functions.invoke('evaluate-automations', {
            body: {
              trigger_type: 'funnel_changed',
              data: {
                cliente: clienteData,
                funil: {
                  id: orcamento.id,
                  nome: orcamento.nome_funil,
                  status: newStatus ? 'ativo' : 'inativo',
                  orcamento: orcamento.valor_investimento,
                  etapa_funil: orcamento.etapa_funil,
                },
                orcamento: {
                  id: orcamento.id,
                  nome_funil: orcamento.nome_funil,
                  valor_investimento: orcamento.valor_investimento,
                  active: newStatus,
                },
                user_id: actorUserId,
              },
            },
          });
        }
      } catch (automationError) {
        console.error('Erro ao disparar automações de status do funil:', automationError);
      }
    }

    if (orcamento && orcamento.linked_campaigns && orcamento.linked_campaigns.length > 0) {
      const statusStr = newStatus ? 'ACTIVE' : 'PAUSED';
      let successCount = 0;
      let failCount = 0;

      // 3. Update each linked campaign
      const promises = orcamento.linked_campaigns.map(async (camp) => {
        try {
          const { data, error } = await supabase.functions.invoke('meta-update-campaign-status', {
            body: { campaign_id: camp.id, status: statusStr }
          });

          if (error || (data && !data.success)) {
            console.error(`Failed to update campaign ${camp.id}:`, error || data?.error);
            failCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Exception updating campaign ${camp.id}:`, err);
          failCount++;
        }
      });

      await Promise.all(promises);

      if (successCount > 0) {
        toast({
          title: "Atualização de Campanhas",
          description: `${successCount} campanhas foram ${newStatus ? 'ativadas' : 'pausadas'} no Meta Ads.`,
          variant: "default" // or success if available
        });
      }

      if (failCount > 0) {
        toast({
          title: "Atenção",
          description: `Falha ao atualizar ${failCount} campanhas. Verifique o console.`,
          variant: "destructive"
        });
      }
    }
  };
  const abrirEdicao = (orcamento: OrcamentoFunil) => {
    setSelectedOrcamento(orcamento);
    setFormData({
      nome_funil: orcamento.nome_funil,
      valor_investimento: orcamento.valor_investimento.toString(),
      observacoes: orcamento.observacoes || "",
      etapa_funil: orcamento.etapa_funil || "distribuicao_conteudo",
      categoria_explicacao: orcamento.categoria_explicacao || "",
      landing_page_url: orcamento.landing_page_url || ""
    });
    setShowEditarModal(true);
  };
  const abrirHistorico = (orcamento: OrcamentoFunil) => {
    setSelectedOrcamento(orcamento);
    carregarHistorico(orcamento.id);
    setShowHistoricoModal(true);
  };

  const abrirDetalhes = (orcamento: OrcamentoFunil, tab: string = "info") => {
    setSelectedOrcamento(orcamento);
    setModalInitialTab(tab);
    setShowDetalhesModal(true);
  };
  const exportarCSV = () => {
    const headers = ["Funil", "Valor", "Data de Atualização", "Observações"];
    const rows = orcamentos.map(o => [o.nome_funil, `R$ ${o.valor_investimento.toFixed(2)}`, format(new Date(o.data_atualizacao), "dd/MM/yyyy", {
      locale: ptBR
    }), o.observacoes || ""]);
    const csvContent = [headers, ...rows].map(row => row.map(field => `"${field}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `orcamentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };
  const excluirOrcamento = async (orcamento: OrcamentoFunil) => {
    try {
      const {
        error
      } = await supabase.from('orcamentos_funil').delete().eq('id', orcamento.id);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Orçamento excluído com sucesso!"
      });
      carregarOrcamentos();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao excluir orçamento: " + error.message,
        variant: "destructive"
      });
    }
  };
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };
  if (loading) {
    return <div className="flex justify-center items-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }
  return <div className="space-y-6 mx-0 my-0 py-0 px-0">
    {/* Header Responsivo */}
    <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:justify-between lg:items-start">
      <div className="min-w-0 flex-1">
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Visualize o investimento de cada funil e seu histórico
        </p>
      </div>
      <div className="flex flex-col xs:flex-row gap-2 w-full lg:w-auto lg:flex-shrink-0">
        {isEditMode ? (
          <>
            <Button variant="outline" size="sm" onClick={resetOrder} className="flex-1 lg:flex-none text-xs sm:text-sm">
              <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="truncate">Redefinir</span>
            </Button>
            <Button size="sm" onClick={() => setIsEditMode(false)} className="flex-1 lg:flex-none text-xs sm:text-sm">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="truncate">Concluir</span>
            </Button>
          </>
        ) : (
          <>
            {canManageBudgets && !isPublicView && (
              <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)} className="flex-1 lg:flex-none text-xs sm:text-sm">
                <GripVertical className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="truncate">Organizar</span>
              </Button>
            )}
            <Button variant="outline" onClick={exportarCSV} disabled={orcamentos.length === 0} size="sm" className="flex-1 lg:flex-none text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="truncate">Exportar CSV</span>
            </Button>
            {canManageBudgets && !isPublicView && <Button onClick={() => setShowNovoModal(true)} size="sm" className="flex-1 lg:flex-none text-xs sm:text-sm">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="truncate">Novo Orçamento</span>
            </Button>}
          </>
        )}
      </div>
    </div>

    {/* Tabs para alternar entre visualizações */}
    <Tabs defaultValue={clienteId ? "cliente" : "gestores"} className="w-full">


      {/* Aba do Cliente Específico */}
      {clienteId && <TabsContent value="cliente" className="space-y-6">
        {/* Filtros de Pesquisa */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar por nome do funil ou observações..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <div className="flex items-center gap-2 sm:min-w-[200px]">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedFunil} onValueChange={setSelectedFunil}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por funil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os funis</SelectItem>
                {funisUnicos
                  .filter(funil => funil && funil.trim() !== '')
                  .map(funil => <SelectItem key={funil} value={funil}>
                    {funil}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 sm:min-w-[200px]">
            <Power className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="desativados">Desativados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cards de Orçamentos - Mobile First Grid */}
        {isEditMode && orcamentosFiltrados.length > 0 && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground">
            <GripVertical className="h-4 w-4 inline mr-2" />
            Organizando... Arraste os cards para reordenar
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {isEditMode ? (
            <SortableContext items={orcamentosFiltrados.map(o => o.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {orcamentosFiltrados.map(orcamento => (
                  <SortableOrcamentoCard
                    key={orcamento.id}
                    orcamento={orcamento}
                    isEditMode={isEditMode}
                    isPublicView={isPublicView}
                    canManageBudgets={canManageBudgets}
                    onEdit={abrirEdicao}
                    onDelete={excluirOrcamento}
                    onHistorico={abrirHistorico}
                    onDetalhes={(o) => abrirDetalhes(o)}
                    onStatusChange={handleStatusChange}
                    onEditCampaigns={handleEditCampaigns}
                    allCampaigns={campaignsData}
                    onOpenCreatives={(o) => abrirDetalhes(o, "criativos")}
                    formatarMoeda={formatarMoeda}
                  />
                ))}
              </div>
            </SortableContext>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {orcamentosFiltrados.map((orcamento) => (
                <SortableOrcamentoCard
                  key={orcamento.id}
                  orcamento={orcamento}
                  isEditMode={isEditMode}
                  isPublicView={isPublicView}
                  canManageBudgets={canManageBudgets}
                  onEdit={abrirEdicao}
                  onDelete={excluirOrcamento}
                  onHistorico={abrirHistorico}
                  onDetalhes={(o) => abrirDetalhes(o)}
                  onStatusChange={handleStatusChange}
                  onEditCampaigns={handleEditCampaigns}
                  allCampaigns={campaignsData}
                  onOpenCreatives={(o) => abrirDetalhes(o, "criativos")}
                  formatarMoeda={formatarMoeda}
                />
              ))}
            </div>
          )}
        </DndContext>

        {orcamentos.length === 0 && <Card>
          <CardContent className="py-8 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhum orçamento cadastrado</h3>
            <p className="text-muted-foreground">
              {canManageBudgets && !isPublicView ? "Clique em 'Novo Orçamento' para adicionar o primeiro." : "Os orçamentos serão exibidos aqui quando cadastrados."}
            </p>
          </CardContent>
        </Card>}

        {orcamentos.length > 0 && orcamentosFiltrados.length === 0 && <Card>
          <CardContent className="py-8 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros de pesquisa ou remover alguns termos.
            </p>
          </CardContent>
        </Card>}
      </TabsContent>}

      {/* Aba dos Gestores */}
      {showGestorValues && <TabsContent value="gestores" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {gestoresOrcamentos.map(gestor => <Card key={gestor.gestor_user_id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={gestor.gestor_avatar} />
                  <AvatarFallback>
                    {gestor.gestor_nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold truncate">
                    {gestor.gestor_nome}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{gestor.total_clientes} cliente{gestor.total_clientes !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>{gestor.total_orcamentos} funis</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {formatarMoeda(gestor.total_investimento)}
                </div>
                <p className="text-sm text-muted-foreground">Total Investimento</p>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {gestor.funis.slice(0, 5).map((funil, index) => <div key={`${funil.cliente_nome}-${funil.nome_funil}-${index}`} className="flex justify-between items-center p-2 rounded border">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{funil.nome_funil}</p>
                    <p className="text-xs text-muted-foreground truncate">{funil.cliente_nome}</p>
                  </div>
                  <div className="text-sm font-semibold text-primary">
                    {formatarMoeda(funil.valor_investimento)}
                  </div>
                </div>)}
                {gestor.funis.length > 5 && <div className="text-center p-2 text-sm text-muted-foreground">
                  +{gestor.funis.length - 5} funis adicionais
                </div>}
              </div>
            </CardContent>
          </Card>)}
        </div>

        {gestoresOrcamentos.length === 0 && <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhum gestor com orçamentos encontrado</h3>
            <p className="text-muted-foreground">
              Os dados dos gestores aparecerão aqui quando houver orçamentos cadastrados e gestores atribuídos aos clientes.
            </p>
          </CardContent>
        </Card>}
      </TabsContent>}
    </Tabs>

    {/* Modal Novo Orçamento */}
    <Dialog open={showNovoModal} onOpenChange={setShowNovoModal}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Orçamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="nome_funil">Nome do Funil</Label>
            <Input id="nome_funil" value={formData.nome_funil} onChange={e => setFormData({
              ...formData,
              nome_funil: e.target.value
            })} placeholder="Ex: Facebook Ads" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="etapa_funil">Categoria</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{getCategoriaDescricao(formData.etapa_funil)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={formData.etapa_funil} onValueChange={value => setFormData({ ...formData, etapa_funil: value, categoria_explicacao: '' })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_FUNIL.map((categoria) => (
                  <SelectItem key={categoria.value} value={categoria.value}>
                    {categoria.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="valor_investimento">Valor do Investimento (R$)</Label>
            <Input id="valor_investimento" type="number" step="0.01" value={formData.valor_investimento} onChange={e => setFormData({
              ...formData,
              valor_investimento: e.target.value
            })} placeholder="0.00" />
          </div>
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" value={formData.observacoes} onChange={e => setFormData({
              ...formData,
              observacoes: e.target.value
            })} placeholder="Informações adicionais sobre o orçamento..." rows={2} />
          </div>
          <div>
            <Label htmlFor="landing_page_url">Link da Landing Page</Label>
            <Input id="landing_page_url" value={formData.landing_page_url} onChange={e => setFormData({
              ...formData,
              landing_page_url: e.target.value
            })} placeholder="https://..." />
          </div>
          <div>
            <Label htmlFor="categoria_explicacao">Explicação da Categoria</Label>
            <Textarea id="categoria_explicacao" value={formData.categoria_explicacao} onChange={e => setFormData({
              ...formData,
              categoria_explicacao: e.target.value
            })} placeholder={getCategoriaDescricao(formData.etapa_funil) || 'Adicione uma explicação personalizada...'} rows={2} />
            <p className="text-xs text-muted-foreground mt-1">
              Personalize a explicação ou deixe em branco para usar a descrição padrão
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowNovoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarOrcamento}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal Editar Orçamento */}
    <Dialog open={showEditarModal} onOpenChange={setShowEditarModal}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Orçamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit_nome_funil">Nome do Funil</Label>
            <Input id="edit_nome_funil" value={formData.nome_funil} onChange={e => setFormData({
              ...formData,
              nome_funil: e.target.value
            })} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="edit_etapa_funil">Categoria</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{getCategoriaDescricao(formData.etapa_funil)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={formData.etapa_funil} onValueChange={value => setFormData({ ...formData, etapa_funil: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_FUNIL.map((categoria) => (
                  <SelectItem key={categoria.value} value={categoria.value}>
                    {categoria.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit_valor_investimento">Valor do Investimento (R$)</Label>
            <Input id="edit_valor_investimento" type="number" step="0.01" value={formData.valor_investimento} onChange={e => setFormData({
              ...formData,
              valor_investimento: e.target.value
            })} />
          </div>
          <div>
            <Label htmlFor="edit_observacoes">Observações</Label>
            <Textarea id="edit_observacoes" value={formData.observacoes} onChange={e => setFormData({
              ...formData,
              observacoes: e.target.value
            })} rows={2} />
          </div>
          <div>
            <Label htmlFor="edit_landing_page_url">Link da Landing Page</Label>
            <Input id="edit_landing_page_url" value={formData.landing_page_url} onChange={e => setFormData({
              ...formData,
              landing_page_url: e.target.value
            })} placeholder="https://..." />
          </div>
          <div>
            <Label htmlFor="edit_categoria_explicacao">Explicação da Categoria</Label>
            <Textarea id="edit_categoria_explicacao" value={formData.categoria_explicacao} onChange={e => setFormData({
              ...formData,
              categoria_explicacao: e.target.value
            })} placeholder={getCategoriaDescricao(formData.etapa_funil) || 'Adicione uma explicação personalizada...'} rows={2} />
            <p className="text-xs text-muted-foreground mt-1">
              Personalize a explicação ou deixe em branco para usar a descrição padrão
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowEditarModal(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarOrcamento}>
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal Histórico */}
    <Dialog open={showHistoricoModal} onOpenChange={setShowHistoricoModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Histórico de Alterações - {selectedOrcamento?.nome_funil}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {historico.length > 0 ? <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Valor Anterior</TableHead>
                <TableHead>Valor Novo</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.map(item => <TableRow key={item.id}>
                <TableCell>
                  {format(new Date(item.data_alteracao), "dd/MM/yyyy HH:mm", {
                    locale: ptBR
                  })}
                </TableCell>
                <TableCell>
                  {item.valor_anterior ? formatarMoeda(item.valor_anterior) : '-'}
                </TableCell>
                <TableCell>
                  {formatarMoeda(item.valor_novo)}
                </TableCell>
                <TableCell>
                  {item.motivo_alteracao}
                </TableCell>
              </TableRow>)}
            </TableBody>
          </Table> : <div className="text-center py-8">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum histórico de alterações encontrado</p>
          </div>}
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal Detalhes */}
    <OrcamentoDetalhesModal
      open={showDetalhesModal}
      onOpenChange={setShowDetalhesModal}
      orcamento={selectedOrcamento}
      initialTab={modalInitialTab}
    />
  </div>;
};
