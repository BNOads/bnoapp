import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatarNivelAcesso } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Plus, Trash2 } from "lucide-react";

type NivelAcesso = Database["public"]["Enums"]["nivel_acesso"];
type ColaboradorRow = Database["public"]["Tables"]["colaboradores"]["Row"];
type OrganogramaCardRow = Database["public"]["Tables"]["organograma_cards"]["Row"];
type OrganogramaCardInsert = Database["public"]["Tables"]["organograma_cards"]["Insert"];
type OrganogramaArea = "diretoria" | "administracao" | "gestao" | "comunicacao" | "servicos";
const MAX_CUSTOM_CARD_AVATAR_SIZE = 5 * 1024 * 1024;

const AREA_ORDER: OrganogramaArea[] = [
  "diretoria",
  "administracao",
  "gestao",
  "comunicacao",
  "servicos",
];

const AREA_META: Record<OrganogramaArea, { label: string; dot: string; border: string; bg: string }> = {
  diretoria: {
    label: "Diretoria",
    dot: "bg-amber-500",
    border: "border-amber-300 dark:border-amber-900/40",
    bg: "bg-amber-50/70 dark:bg-amber-950/10",
  },
  administracao: {
    label: "Administracao",
    dot: "bg-blue-500",
    border: "border-blue-300 dark:border-blue-900/40",
    bg: "bg-blue-50/70 dark:bg-blue-950/10",
  },
  gestao: {
    label: "Gestao",
    dot: "bg-emerald-500",
    border: "border-emerald-300 dark:border-emerald-900/40",
    bg: "bg-emerald-50/70 dark:bg-emerald-950/10",
  },
  comunicacao: {
    label: "Comunicacao",
    dot: "bg-fuchsia-500",
    border: "border-fuchsia-300 dark:border-fuchsia-900/40",
    bg: "bg-fuchsia-50/70 dark:bg-fuchsia-950/10",
  },
  servicos: {
    label: "Servicos",
    dot: "bg-pink-500",
    border: "border-pink-300 dark:border-pink-900/40",
    bg: "bg-pink-50/70 dark:bg-pink-950/10",
  },
};

const NIVEL_OPTIONS: { value: NivelAcesso; label: string; area: OrganogramaArea }[] = [
  { value: "dono", label: "Dono", area: "diretoria" },
  { value: "admin", label: "Administrador", area: "administracao" },
  { value: "gestor_trafego", label: "Gestor de Trafego", area: "gestao" },
  { value: "gestor_projetos", label: "Gestor de Projetos", area: "gestao" },
  { value: "cs", label: "Customer Success", area: "comunicacao" },
  { value: "designer", label: "Designer", area: "comunicacao" },
  { value: "editor_video", label: "Editor de Video", area: "comunicacao" },
  { value: "webdesigner", label: "Webdesigner", area: "servicos" },
];

const AREA_BY_NIVEL = NIVEL_OPTIONS.reduce<Record<NivelAcesso, OrganogramaArea>>(
  (acc, item) => {
    acc[item.value] = item.area;
    return acc;
  },
  {} as Record<NivelAcesso, OrganogramaArea>
);

const DEFAULT_NIVEL_BY_AREA: Record<OrganogramaArea, NivelAcesso> = {
  diretoria: "dono",
  administracao: "admin",
  gestao: "gestor_trafego",
  comunicacao: "cs",
  servicos: "webdesigner",
};

const getAreaByNivel = (nivel: NivelAcesso): OrganogramaArea => AREA_BY_NIVEL[nivel] ?? "servicos";

const sortCards = (cards: OrganogramaCardRow[]) =>
  [...cards].sort((a, b) => {
    const areaDiff = AREA_ORDER.indexOf(a.area as OrganogramaArea) - AREA_ORDER.indexOf(b.area as OrganogramaArea);
    if (areaDiff !== 0) return areaDiff;
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

const groupCardsByArea = (cards: OrganogramaCardRow[]) => {
  const grouped: Record<OrganogramaArea, OrganogramaCardRow[]> = {
    diretoria: [],
    administracao: [],
    gestao: [],
    comunicacao: [],
    servicos: [],
  };

  for (const card of sortCards(cards)) {
    const area = (card.area as OrganogramaArea) || "servicos";
    grouped[area].push(card);
  }

  return grouped;
};

const reindexGroupedCards = (grouped: Record<OrganogramaArea, OrganogramaCardRow[]>) =>
  AREA_ORDER.flatMap((area) => grouped[area].map((card, index) => ({ ...card, area, ordem: index })));

const buildFallbackCards = (colaboradores: ColaboradorRow[]): OrganogramaCardRow[] => {
  const groupedCounter: Record<OrganogramaArea, number> = {
    diretoria: 0,
    administracao: 0,
    gestao: 0,
    comunicacao: 0,
    servicos: 0,
  };

  return colaboradores
    .filter((col) => col.ativo)
    .map((col) => {
      const area = getAreaByNivel(col.nivel_acesso);
      const ordem = groupedCounter[area];
      groupedCounter[area] += 1;
      const now = new Date().toISOString();

      return {
        id: `fallback-${col.id}`,
        colaborador_id: col.id,
        nome: col.nome,
        cargo_display: col.cargo_display,
        email: col.email,
        avatar_url: col.avatar_url,
        area,
        ordem,
        is_custom: false,
        ativo: true,
        created_at: now,
        updated_at: now,
        created_by: null,
        updated_by: null,
      } satisfies OrganogramaCardRow;
    });
};

interface OrganizerViewProps {
  colaboradores: ColaboradorRow[];
  isAdmin: boolean;
  onOpenDetail: (colaborador: ColaboradorRow) => void;
  onRefresh: () => void;
  searchTerm?: string;
}

interface AreaDropZoneProps {
  area: OrganogramaArea;
  children: ReactNode;
  disabled?: boolean;
}

const AreaDropZone = ({ area, children, disabled = false }: AreaDropZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: `area-${area}`, disabled });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] rounded-xl border border-dashed p-3 transition-colors",
        isOver && !disabled ? "border-primary bg-primary/5" : "border-border/60"
      )}
    >
      {children}
    </div>
  );
};

interface SortableCardProps {
  card: OrganogramaCardRow;
  colaborador?: ColaboradorRow;
  isAdmin: boolean;
  schemaReady: boolean;
  isSearchMode: boolean;
  onOpenDetail: (colaborador: ColaboradorRow) => void;
  onRoleChange: (card: OrganogramaCardRow, nivel: NivelAcesso) => void;
  onCustomAreaChange: (card: OrganogramaCardRow, area: OrganogramaArea) => void;
  onDeleteCustomCard: (card: OrganogramaCardRow) => void;
  onCustomAvatarUpload: (card: OrganogramaCardRow, file: File) => void;
  isCustomAvatarUploading: boolean;
}

const SortableCard = ({
  card,
  colaborador,
  isAdmin,
  schemaReady,
  isSearchMode,
  onOpenDetail,
  onRoleChange,
  onCustomAreaChange,
  onDeleteCustomCard,
  onCustomAvatarUpload,
  isCustomAvatarUploading,
}: SortableCardProps) => {
  const canManage = isAdmin && !isSearchMode && schemaReady;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !canManage,
  });

  const meta = AREA_META[(card.area as OrganogramaArea) || "servicos"];
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const initials = card.nome
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const displayCargo =
    card.cargo_display ||
    (colaborador?.nivel_acesso ? formatarNivelAcesso(colaborador.nivel_acesso) : "Sem funcao definida");

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn("border-2 shadow-sm", meta.border, meta.bg)}
    >
      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full", meta.dot)} />
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {meta.label}
              </p>
            </div>
            <h3
              className={cn("line-clamp-2 mt-1 text-sm font-semibold", colaborador ? "cursor-pointer hover:underline" : "")}
              onClick={() => colaborador && onOpenDetail(colaborador)}
            >
              {card.nome}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            {card.is_custom && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                Extra
              </Badge>
            )}
            {canManage && (
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-background/70"
                aria-label="Arrastar card"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {card.avatar_url && <AvatarImage src={card.avatar_url} alt={card.nome} />}
            <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{displayCargo}</p>
            {card.email && <p className="truncate text-[11px] text-muted-foreground/80">{card.email}</p>}
          </div>
        </div>

        {canManage && colaborador && (
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Funcao no organograma</Label>
            <Select value={colaborador.nivel_acesso} onValueChange={(value) => onRoleChange(card, value as NivelAcesso)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NIVEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {canManage && card.is_custom && (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Area</Label>
              <Select value={card.area as OrganogramaArea} onValueChange={(value) => onCustomAreaChange(card, value as OrganogramaArea)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREA_ORDER.map((area) => (
                    <SelectItem key={area} value={area}>
                      {AREA_META[area].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Foto</Label>
              <Input
                type="file"
                accept="image/*"
                className="h-8 text-[11px]"
                disabled={isCustomAvatarUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) {
                    onCustomAvatarUpload(card, file);
                  }
                }}
              />
              {isCustomAvatarUploading && (
                <p className="text-[10px] text-muted-foreground">Enviando foto...</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => onDeleteCustomCard(card)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Remover card
            </Button>
          </div>
        )}

      </div>
    </Card>
  );
};

export const OrganizerView = ({
  colaboradores,
  isAdmin,
  onOpenDetail,
  onRefresh,
  searchTerm = "",
}: OrganizerViewProps) => {
  const { toast } = useToast();
  const [cards, setCards] = useState<OrganogramaCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [newCardModalOpen, setNewCardModalOpen] = useState(false);
  const [creatingCard, setCreatingCard] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newCardAvatarFile, setNewCardAvatarFile] = useState<File | null>(null);
  const [newCardAvatarPreview, setNewCardAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatarByCard, setUploadingAvatarByCard] = useState<Record<string, boolean>>({});
  const [newCardForm, setNewCardForm] = useState({
    nome: "",
    cargo_display: "",
    email: "",
    area: "servicos" as OrganogramaArea,
  });
  const newCardInitials = useMemo(() => {
    const value = newCardForm.nome.trim();
    if (!value) return "NC";

    return value
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [newCardForm.nome]);

  const resetNewCardForm = useCallback(() => {
    setNewCardForm({ nome: "", cargo_display: "", email: "", area: "servicos" });
    setNewCardAvatarFile(null);
    setNewCardAvatarPreview(null);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const isSearchMode = searchTerm.trim().length > 0;

  const colaboradoresById = useMemo(
    () => new Map(colaboradores.map((colaborador) => [colaborador.id, colaborador])),
    [colaboradores]
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const visibleCards = useMemo(() => {
    if (!normalizedSearch) return cards.filter((card) => card.ativo);

    return cards.filter((card) => {
      if (!card.ativo) return false;
      const haystack = `${card.nome} ${card.cargo_display ?? ""} ${card.email ?? ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [cards, normalizedSearch]);

  const cardsByArea = useMemo(() => groupCardsByArea(visibleCards), [visibleCards]);

  const syncCardsWithColaboradores = useCallback(
    async (baseCards: OrganogramaCardRow[]) => {
      if (!isAdmin || !schemaReady) return baseCards;

      const updates = baseCards
        .filter((card) => card.colaborador_id)
        .map((card) => {
          const colaborador = card.colaborador_id ? colaboradoresById.get(card.colaborador_id) : null;
          if (!colaborador) return null;

          const desiredArea = getAreaByNivel(colaborador.nivel_acesso);
          const patch: Partial<OrganogramaCardRow> = {};

          if (card.nome !== colaborador.nome) patch.nome = colaborador.nome;
          if (card.cargo_display !== colaborador.cargo_display) patch.cargo_display = colaborador.cargo_display;
          if (card.email !== colaborador.email) patch.email = colaborador.email;
          if (card.avatar_url !== colaborador.avatar_url) patch.avatar_url = colaborador.avatar_url;
          if (card.area !== desiredArea) patch.area = desiredArea;

          if (Object.keys(patch).length === 0) return null;

          return {
            id: card.id,
            patch,
          };
        })
        .filter(Boolean) as Array<{ id: string; patch: Partial<OrganogramaCardRow> }>;

      if (updates.length === 0) return baseCards;

      const nextCards = [...baseCards];

      for (const update of updates) {
        const { data, error } = await supabase
          .from("organograma_cards")
          .update({ ...update.patch, updated_by: currentUserId })
          .eq("id", update.id)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        const idx = nextCards.findIndex((card) => card.id === update.id);
        if (idx >= 0 && data) {
          nextCards[idx] = data;
        }
      }

      return nextCards;
    },
    [colaboradoresById, currentUserId, isAdmin, schemaReady]
  );

  const ensureMissingColaboradorCards = useCallback(
    async (baseCards: OrganogramaCardRow[]) => {
      const existingByColaborador = new Map(
        baseCards.filter((card) => card.colaborador_id).map((card) => [card.colaborador_id!, card])
      );

      const grouped = groupCardsByArea(baseCards);
      const nextOrderByArea: Record<OrganogramaArea, number> = {
        diretoria: grouped.diretoria.length,
        administracao: grouped.administracao.length,
        gestao: grouped.gestao.length,
        comunicacao: grouped.comunicacao.length,
        servicos: grouped.servicos.length,
      };

      const missingPayload: OrganogramaCardInsert[] = [];

      for (const colaborador of colaboradores.filter((col) => col.ativo)) {
        if (existingByColaborador.has(colaborador.id)) continue;

        const area = getAreaByNivel(colaborador.nivel_acesso);
        missingPayload.push({
          colaborador_id: colaborador.id,
          nome: colaborador.nome,
          cargo_display: colaborador.cargo_display,
          email: colaborador.email,
          avatar_url: colaborador.avatar_url,
          area,
          ordem: nextOrderByArea[area],
          is_custom: false,
          ativo: true,
          created_by: currentUserId,
          updated_by: currentUserId,
        });

        nextOrderByArea[area] += 1;
      }

      if (missingPayload.length === 0) return baseCards;

      const { data, error } = await supabase.from("organograma_cards").insert(missingPayload).select("*");

      if (error) {
        // Se o usuário não tiver permissão de escrita, mantém fallback local sem bloquear visualização.
        return [...baseCards, ...buildFallbackCards(colaboradores).filter((card) => !existingByColaborador.has(card.colaborador_id!))];
      }

      return [...baseCards, ...(data || [])];
    },
    [colaboradores, currentUserId]
  );

  const loadOrganograma = useCallback(async () => {
    setLoading(true);

    try {
      const { data: cardsData, error: cardsError } = await supabase.from("organograma_cards").select("*").eq("ativo", true);

      if (cardsError) {
        if (cardsError.code === "42P01") {
          setSchemaReady(false);
          setCards(buildFallbackCards(colaboradores));
          return;
        }
        throw cardsError;
      }

      setSchemaReady(true);

      let nextCards = cardsData || [];
      nextCards = await ensureMissingColaboradorCards(nextCards);
      nextCards = await syncCardsWithColaboradores(nextCards);

      setCards(sortCards(nextCards));
    } catch (error: any) {
      setSchemaReady(false);
      setCards(buildFallbackCards(colaboradores));
      toast({
        title: "Erro ao carregar organograma",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [colaboradores, ensureMissingColaboradorCards, syncCardsWithColaboradores, toast]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    loadOrganograma();
  }, [loadOrganograma]);

  const persistChangedCards = useCallback(
    async (nextCards: OrganogramaCardRow[], changedIds: string[]) => {
      if (!schemaReady || changedIds.length === 0) return;

      const cardsById = new Map(nextCards.map((card) => [card.id, card]));

      for (const cardId of changedIds) {
        if (cardId.startsWith("fallback-")) continue;

        const card = cardsById.get(cardId);
        if (!card) continue;

        const { error } = await supabase
          .from("organograma_cards")
          .update({ area: card.area, ordem: card.ordem, updated_by: currentUserId })
          .eq("id", card.id);

        if (error) throw error;
      }
    },
    [currentUserId, schemaReady]
  );

  const moveCardToArea = useCallback(
    (baseCards: OrganogramaCardRow[], cardId: string, targetArea: OrganogramaArea) => {
      const grouped = groupCardsByArea(baseCards);

      let sourceArea: OrganogramaArea | null = null;
      let movedCard: OrganogramaCardRow | null = null;

      for (const area of AREA_ORDER) {
        const index = grouped[area].findIndex((card) => card.id === cardId);
        if (index >= 0) {
          sourceArea = area;
          [movedCard] = grouped[area].splice(index, 1);
          break;
        }
      }

      if (!movedCard || !sourceArea) {
        return {
          nextCards: baseCards,
          changedIds: [] as string[],
          movedArea: null as OrganogramaArea | null,
        };
      }

      grouped[targetArea].push({ ...movedCard, area: targetArea });
      const nextCards = reindexGroupedCards(grouped);

      const prevById = new Map(baseCards.map((card) => [card.id, card]));
      const changedIds = nextCards
        .filter((card) => {
          const prev = prevById.get(card.id);
          return !prev || prev.area !== card.area || prev.ordem !== card.ordem;
        })
        .map((card) => card.id);

      return {
        nextCards,
        changedIds,
        movedArea: sourceArea === targetArea ? null : targetArea,
      };
    },
    []
  );

  const updateColaboradorAreaRole = useCallback(async (colaborador: ColaboradorRow, area: OrganogramaArea) => {
    const nextNivel = AREA_BY_NIVEL[colaborador.nivel_acesso] === area ? colaborador.nivel_acesso : DEFAULT_NIVEL_BY_AREA[area];

    const { error } = await supabase.from("colaboradores").update({ nivel_acesso: nextNivel }).eq("id", colaborador.id);

    if (error) throw error;
  }, []);

  const handleRoleChange = useCallback(
    async (card: OrganogramaCardRow, nivel: NivelAcesso) => {
      if (!card.colaborador_id) return;

      const colaborador = colaboradoresById.get(card.colaborador_id);
      if (!colaborador) return;

      const nextArea = getAreaByNivel(nivel);
      const baseCards = cards;

      try {
        const { error } = await supabase.from("colaboradores").update({ nivel_acesso: nivel }).eq("id", colaborador.id);
        if (error) throw error;

        if ((card.area as OrganogramaArea) !== nextArea) {
          const { nextCards, changedIds } = moveCardToArea(baseCards, card.id, nextArea);
          setCards(nextCards);
          await persistChangedCards(nextCards, changedIds);
        }

        onRefresh();

        toast({
          title: "Funcao atualizada",
          description: `${card.nome} foi movido para ${AREA_META[nextArea].label}.`,
        });
      } catch (error: any) {
        toast({
          title: "Erro ao atualizar funcao",
          description: error.message,
          variant: "destructive",
        });
        loadOrganograma();
      }
    },
    [cards, colaboradoresById, loadOrganograma, moveCardToArea, onRefresh, persistChangedCards, toast]
  );

  const handleCustomAreaChange = useCallback(
    async (card: OrganogramaCardRow, area: OrganogramaArea) => {
      const baseCards = cards;
      const { nextCards, changedIds } = moveCardToArea(baseCards, card.id, area);

      setCards(nextCards);

      try {
        await persistChangedCards(nextCards, changedIds);
      } catch (error: any) {
        toast({
          title: "Erro ao mover card",
          description: error.message,
          variant: "destructive",
        });
        loadOrganograma();
      }
    },
    [cards, loadOrganograma, moveCardToArea, persistChangedCards, toast]
  );

  const handleDeleteCustomCard = useCallback(
    async (card: OrganogramaCardRow) => {
      if (!card.is_custom || card.id.startsWith("fallback-")) return;

      const baseCards = cards;
      const filtered = baseCards.filter((item) => item.id !== card.id);
      const nextCards = reindexGroupedCards(groupCardsByArea(filtered));

      const prevById = new Map(baseCards.map((item) => [item.id, item]));
      const changedIds = nextCards
        .filter((item) => {
          const prev = prevById.get(item.id);
          return !prev || prev.area !== item.area || prev.ordem !== item.ordem;
        })
        .map((item) => item.id);

      setCards(nextCards);

      try {
        const { error } = await supabase.from("organograma_cards").delete().eq("id", card.id);
        if (error) throw error;

        await persistChangedCards(nextCards, changedIds);
      } catch (error: any) {
        toast({
          title: "Erro ao remover card",
          description: error.message,
          variant: "destructive",
        });
        loadOrganograma();
      }
    },
    [cards, loadOrganograma, persistChangedCards, toast]
  );

  const uploadCustomAvatar = useCallback(
    async (file: File) => {
      if (!currentUserId) {
        throw new Error("Usuario nao autenticado.");
      }

      if (!file.type.startsWith("image/")) {
        throw new Error("Selecione um arquivo de imagem.");
      }

      if (file.size > MAX_CUSTOM_CARD_AVATAR_SIZE) {
        throw new Error("A imagem deve ter no maximo 5MB.");
      }

      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const fileName = `${currentUserId}/organograma-custom/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, {
        upsert: false,
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      return data.publicUrl;
    },
    [currentUserId]
  );

  const handleNewCardAvatarChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Arquivo invalido",
          description: "Selecione um arquivo de imagem.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > MAX_CUSTOM_CARD_AVATAR_SIZE) {
        toast({
          title: "Imagem muito grande",
          description: "A imagem deve ter no maximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      setNewCardAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCardAvatarPreview(typeof reader.result === "string" ? reader.result : null);
      };
      reader.readAsDataURL(file);
    },
    [toast]
  );

  const handleCustomCardAvatarUpload = useCallback(
    async (card: OrganogramaCardRow, file: File) => {
      if (!card.is_custom || card.id.startsWith("fallback-")) return;

      setUploadingAvatarByCard((prev) => ({ ...prev, [card.id]: true }));

      try {
        const avatarUrl = await uploadCustomAvatar(file);
        const { data, error } = await supabase
          .from("organograma_cards")
          .update({ avatar_url: avatarUrl, updated_by: currentUserId })
          .eq("id", card.id)
          .select("*")
          .single();

        if (error) throw error;

        setCards((prev) => sortCards(prev.map((item) => (item.id === card.id ? data || { ...item, avatar_url: avatarUrl } : item))));
      } catch (error: any) {
        toast({
          title: "Erro ao enviar foto",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setUploadingAvatarByCard((prev) => {
          const next = { ...prev };
          delete next[card.id];
          return next;
        });
      }
    },
    [currentUserId, toast, uploadCustomAvatar]
  );

  const handleCreateCustomCard = useCallback(async () => {
    if (!schemaReady) {
      toast({
        title: "Migracao pendente",
        description: "Aplique a migracao do organograma para salvar cards personalizados.",
        variant: "destructive",
      });
      return;
    }

    const nome = newCardForm.nome.trim();
    if (!nome) {
      toast({
        title: "Nome obrigatorio",
        description: "Preencha o nome do card personalizado.",
        variant: "destructive",
      });
      return;
    }

    setCreatingCard(true);

    try {
      const ordem = cards.filter((card) => card.area === newCardForm.area).length;
      const avatarUrl = newCardAvatarFile ? await uploadCustomAvatar(newCardAvatarFile) : null;

      const payload: OrganogramaCardInsert = {
        nome,
        cargo_display: newCardForm.cargo_display.trim() || null,
        email: newCardForm.email.trim() || null,
        avatar_url: avatarUrl,
        area: newCardForm.area,
        ordem,
        is_custom: true,
        ativo: true,
        created_by: currentUserId,
        updated_by: currentUserId,
      };

      const { data, error } = await supabase.from("organograma_cards").insert(payload).select("*").single();

      if (error) throw error;

      if (data) {
        setCards((prev) => sortCards([...prev, data]));
      }

      resetNewCardForm();
      setNewCardModalOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao criar card",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingCard(false);
    }
  }, [cards, currentUserId, newCardAvatarFile, newCardForm, resetNewCardForm, schemaReady, toast, uploadCustomAvatar]);

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingCardId(String(event.active.id));
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setDraggingCardId(null);
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDraggingCardId(null);

      if (!isAdmin || isSearchMode || !schemaReady) return;

      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      if (activeId === overId) return;

      const activeCard = cards.find((card) => card.id === activeId);
      if (!activeCard) return;

      const sourceArea = activeCard.area as OrganogramaArea;
      const targetArea = overId.startsWith("area-")
        ? (overId.replace("area-", "") as OrganogramaArea)
        : ((cards.find((card) => card.id === overId)?.area as OrganogramaArea) || sourceArea);

      const grouped = groupCardsByArea(cards);
      const sourceList = [...grouped[sourceArea]];
      const sourceIndex = sourceList.findIndex((card) => card.id === activeId);
      if (sourceIndex < 0) return;

      if (sourceArea === targetArea) {
        const targetIndex = overId.startsWith("area-")
          ? sourceList.length - 1
          : sourceList.findIndex((card) => card.id === overId);

        if (targetIndex < 0 || sourceIndex === targetIndex) return;

        grouped[sourceArea] = arrayMove(sourceList, sourceIndex, targetIndex);
      } else {
        const [movedCard] = sourceList.splice(sourceIndex, 1);
        grouped[sourceArea] = sourceList;

        const targetList = [...grouped[targetArea]];
        const targetIndex = overId.startsWith("area-")
          ? targetList.length
          : targetList.findIndex((card) => card.id === overId);

        const insertAt = targetIndex < 0 ? targetList.length : targetIndex;
        targetList.splice(insertAt, 0, { ...movedCard, area: targetArea });
        grouped[targetArea] = targetList;
      }

      const nextCards = reindexGroupedCards(grouped);
      const prevById = new Map(cards.map((card) => [card.id, card]));
      const changedIds = nextCards
        .filter((card) => {
          const prev = prevById.get(card.id);
          return !prev || prev.area !== card.area || prev.ordem !== card.ordem;
        })
        .map((card) => card.id);

      setCards(nextCards);

      try {
        if (sourceArea !== targetArea && activeCard.colaborador_id) {
          const colaborador = colaboradoresById.get(activeCard.colaborador_id);
          if (colaborador) {
            await updateColaboradorAreaRole(colaborador, targetArea);
            onRefresh();
          }
        }

        await persistChangedCards(nextCards, changedIds);
      } catch (error: any) {
        toast({
          title: "Erro ao mover card",
          description: error.message,
          variant: "destructive",
        });
        loadOrganograma();
      }
    },
    [cards, colaboradoresById, isAdmin, isSearchMode, loadOrganograma, onRefresh, persistChangedCards, schemaReady, toast, updateColaboradorAreaRole]
  );

  const renderAreaSection = useCallback(
    (area: OrganogramaArea, options?: { verticalCards?: boolean }) => {
      const verticalCards = options?.verticalCards ?? false;

      return (
        <section key={area} className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <div className={cn("h-2.5 w-2.5 rounded-full", AREA_META[area].dot)} />
            <h3 className="text-sm font-semibold">{AREA_META[area].label}</h3>
            <Badge variant="secondary" className="text-[10px]">
              {cardsByArea[area].length}
            </Badge>
          </div>

          <AreaDropZone area={area} disabled={!isAdmin || isSearchMode || !schemaReady}>
            <SortableContext
              items={cardsByArea[area].map((card) => card.id)}
              strategy={verticalCards ? verticalListSortingStrategy : rectSortingStrategy}
            >
              <div className={verticalCards ? "space-y-3" : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
                {cardsByArea[area].map((card) => {
                  const colaborador = card.colaborador_id ? colaboradoresById.get(card.colaborador_id) : undefined;

                  return (
                    <SortableCard
                      key={card.id}
                      card={card}
                      colaborador={colaborador}
                      isAdmin={isAdmin}
                      schemaReady={schemaReady}
                      isSearchMode={isSearchMode}
                      onOpenDetail={onOpenDetail}
                      onRoleChange={handleRoleChange}
                      onCustomAreaChange={handleCustomAreaChange}
                      onDeleteCustomCard={handleDeleteCustomCard}
                      onCustomAvatarUpload={handleCustomCardAvatarUpload}
                      isCustomAvatarUploading={Boolean(uploadingAvatarByCard[card.id])}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </AreaDropZone>
        </section>
      );
    },
    [
      cardsByArea,
      colaboradoresById,
      isAdmin,
      isSearchMode,
      schemaReady,
      onOpenDetail,
      handleRoleChange,
      handleCustomAreaChange,
      handleDeleteCustomCard,
      handleCustomCardAvatarUpload,
      uploadingAvatarByCard,
    ]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="hero" size="sm" onClick={() => setNewCardModalOpen(true)} disabled={!schemaReady}>
            <Plus className="mr-1 h-4 w-4" />
            Novo Card Personalizado
          </Button>
        </div>
      )}

      {!schemaReady && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          A migracao do organograma ainda nao foi aplicada. Cards personalizados e ordenacao nao serao salvos.
        </div>
      )}

      {isSearchMode && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Busca ativa: arrastar cards fica desabilitado para evitar reordenacao parcial.
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          {(["diretoria", "administracao"] as OrganogramaArea[]).map((area) => renderAreaSection(area))}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {(["gestao", "comunicacao", "servicos"] as OrganogramaArea[]).map((area) =>
              renderAreaSection(area, { verticalCards: true })
            )}
          </div>
        </div>
      </DndContext>

      {!loading && visibleCards.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum card encontrado para o filtro atual.
        </div>
      )}

      <Dialog
        open={newCardModalOpen}
        onOpenChange={(open) => {
          setNewCardModalOpen(open);
          if (!open) {
            resetNewCardForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Novo card personalizado</DialogTitle>
            <DialogDescription>
              Crie um card para pessoas que nao fazem parte dos usuarios cadastrados na plataforma.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label htmlFor="novo-card-nome">Nome</Label>
              <Input
                id="novo-card-nome"
                value={newCardForm.nome}
                onChange={(e) => setNewCardForm((prev) => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Parceiro Freelancer"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="novo-card-cargo">Cargo / papel</Label>
              <Input
                id="novo-card-cargo"
                value={newCardForm.cargo_display}
                onChange={(e) => setNewCardForm((prev) => ({ ...prev, cargo_display: e.target.value }))}
                placeholder="Ex: Consultor Externo"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="novo-card-email">Email (opcional)</Label>
              <Input
                id="novo-card-email"
                value={newCardForm.email}
                onChange={(e) => setNewCardForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="contato@exemplo.com"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="novo-card-foto">Foto (opcional)</Label>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {newCardAvatarPreview && <AvatarImage src={newCardAvatarPreview} alt={newCardForm.nome || "Novo card"} />}
                  <AvatarFallback className="text-xs font-bold">{newCardInitials}</AvatarFallback>
                </Avatar>
                <Input
                  id="novo-card-foto"
                  type="file"
                  accept="image/*"
                  onChange={handleNewCardAvatarChange}
                  disabled={creatingCard}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Formatos de imagem. Tamanho maximo: 5MB.</p>
            </div>

            <div className="space-y-1">
              <Label>Area inicial</Label>
              <Select
                value={newCardForm.area}
                onValueChange={(value) => setNewCardForm((prev) => ({ ...prev, area: value as OrganogramaArea }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREA_ORDER.map((area) => (
                    <SelectItem key={area} value={area}>
                      {AREA_META[area].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetNewCardForm();
                setNewCardModalOpen(false);
              }}
              disabled={creatingCard}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateCustomCard} disabled={creatingCard}>
              {creatingCard ? "Salvando..." : "Criar card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {draggingCardId && <p className="text-center text-xs text-muted-foreground">Movendo card...</p>}
    </div>
  );
};
