import { useState, useEffect, useRef, useCallback } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, LayoutGrid, List, GitBranch } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/hooks/useSearch";
import { CampoFutebol } from "./CampoFutebol";
import { ColaboradorFieldCard } from "./ColaboradorFieldCard";
import { ColaboradorDetailModal } from "./ColaboradorDetailModal";
import { ColaboradorListView } from "./ColaboradorListView";
import { OrganizerView } from "./OrganizerView";
import { NovoColaboradorModal } from "@/components/Colaboradores/NovoColaboradorModal";
import { EditarColaboradorModal } from "@/components/Colaboradores/EditarColaboradorModal";
import { AlterarSenhaModal } from "@/components/Colaboradores/AlterarSenhaModal";

type ViewMode = "campo" | "lista" | "organograma";

// Distribui posições padrão no campo em formato de formação de futebol
const gerarPosicoesPadrao = (total: number): { x: number; y: number }[] => {
  if (total === 0) return [];

  const formacoes: Record<number, { x: number; y: number }[]> = {
    1: [{ x: 50, y: 50 }],
    2: [{ x: 35, y: 50 }, { x: 65, y: 50 }],
    3: [{ x: 50, y: 25 }, { x: 30, y: 60 }, { x: 70, y: 60 }],
    4: [{ x: 50, y: 20 }, { x: 25, y: 50 }, { x: 75, y: 50 }, { x: 50, y: 75 }],
    5: [
      { x: 50, y: 15 },
      { x: 25, y: 40 }, { x: 75, y: 40 },
      { x: 30, y: 70 }, { x: 70, y: 70 },
    ],
    6: [
      { x: 50, y: 12 },
      { x: 25, y: 35 }, { x: 75, y: 35 },
      { x: 20, y: 65 }, { x: 50, y: 65 }, { x: 80, y: 65 },
    ],
    7: [
      { x: 50, y: 12 },
      { x: 25, y: 35 }, { x: 75, y: 35 },
      { x: 15, y: 60 }, { x: 40, y: 60 }, { x: 60, y: 60 }, { x: 85, y: 60 },
    ],
    8: [
      { x: 50, y: 10 },
      { x: 25, y: 30 }, { x: 50, y: 30 }, { x: 75, y: 30 },
      { x: 15, y: 60 }, { x: 40, y: 60 }, { x: 60, y: 60 }, { x: 85, y: 60 },
    ],
    9: [
      { x: 50, y: 10 },
      { x: 25, y: 30 }, { x: 50, y: 30 }, { x: 75, y: 30 },
      { x: 20, y: 55 }, { x: 50, y: 55 }, { x: 80, y: 55 },
      { x: 35, y: 78 }, { x: 65, y: 78 },
    ],
    10: [
      { x: 50, y: 10 },
      { x: 25, y: 28 }, { x: 50, y: 28 }, { x: 75, y: 28 },
      { x: 20, y: 52 }, { x: 50, y: 52 }, { x: 80, y: 52 },
      { x: 20, y: 78 }, { x: 50, y: 78 }, { x: 80, y: 78 },
    ],
    11: [
      { x: 50, y: 8 },
      { x: 20, y: 25 }, { x: 40, y: 25 }, { x: 60, y: 25 }, { x: 80, y: 25 },
      { x: 20, y: 50 }, { x: 40, y: 50 }, { x: 60, y: 50 }, { x: 80, y: 50 },
      { x: 35, y: 78 }, { x: 65, y: 78 },
    ],
  };

  if (formacoes[total]) return formacoes[total];

  const posicoes: { x: number; y: number }[] = [];
  const linhas = Math.ceil(total / 4);
  let idx = 0;

  for (let linha = 0; linha < linhas && idx < total; linha++) {
    const restante = total - idx;
    const nesteLinha = Math.min(restante, linha === 0 ? Math.min(restante, 2) : 4);
    const yPos = 10 + (linha / (linhas - 1 || 1)) * 80;

    for (let col = 0; col < nesteLinha; col++) {
      const xPos = nesteLinha === 1 ? 50 : 15 + (col / (nesteLinha - 1)) * 70;
      posicoes.push({ x: xPos, y: yPos });
      idx++;
    }
  }

  return posicoes;
};

export const TimeEmCampoTab = () => {
  const { isAdmin } = useUserPermissions();
  const { toast } = useToast();
  const fieldRef = useRef<HTMLDivElement>(null);

  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("campo");

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState<any>(null);
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [senhaModalOpen, setSenhaModalOpen] = useState(false);

  // Search
  const { searchTerm, setSearchTerm, filteredItems } = useSearch(colaboradores, [
    "nome",
    "email",
    "cargo_display",
    "nivel_acesso",
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const carregarColaboradores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;

      const lista = data || [];

      // Auto-posicionar membros sem posição
      const semPosicao = lista.filter(
        (c) => c.campo_pos_x === null || c.campo_pos_y === null
      );

      if (semPosicao.length > 0) {
        const posicoesPadrao = gerarPosicoesPadrao(lista.length);
        const atualizados = lista.map((c, i) => {
          if (c.campo_pos_x === null || c.campo_pos_y === null) {
            const pos = posicoesPadrao[i] || { x: 50, y: 50 };
            return { ...c, campo_pos_x: pos.x, campo_pos_y: pos.y };
          }
          return c;
        });

        // Salvar posições no banco em background
        const updates = semPosicao.map((c) => {
          const idx = lista.indexOf(c);
          const pos = posicoesPadrao[idx] || { x: 50, y: 50 };
          return supabase
            .from("colaboradores")
            .update({ campo_pos_x: pos.x, campo_pos_y: pos.y })
            .eq("id", c.id);
        });
        Promise.all(updates).catch(() => {});

        setColaboradores(atualizados);
      } else {
        setColaboradores(lista);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar colaboradores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarColaboradores();
  }, [carregarColaboradores]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!fieldRef.current || !delta) return;

    const fieldRect = fieldRef.current.getBoundingClientRect();
    const colab = colaboradores.find((c) => c.id === active.id);
    if (!colab) return;

    const startX = colab.campo_pos_x ?? 50;
    const startY = colab.campo_pos_y ?? 50;

    const deltaXPercent = (delta.x / fieldRect.width) * 100;
    const deltaYPercent = (delta.y / fieldRect.height) * 100;

    const newX = Math.max(2, Math.min(98, startX + deltaXPercent));
    const newY = Math.max(2, Math.min(98, startY + deltaYPercent));

    setColaboradores((prev) =>
      prev.map((c) =>
        c.id === active.id ? { ...c, campo_pos_x: newX, campo_pos_y: newY } : c
      )
    );

    const { error } = await supabase
      .from("colaboradores")
      .update({ campo_pos_x: newX, campo_pos_y: newY })
      .eq("id", String(active.id));

    if (error) {
      toast({
        title: "Erro ao salvar posição",
        description: error.message,
        variant: "destructive",
      });
      carregarColaboradores();
    }
  };

  const handleOpenDetail = (colab: any) => {
    setSelectedColaborador(colab);
    setDetailModalOpen(true);
  };

  const handleEdit = (colab: any) => {
    setSelectedColaborador(colab);
    setEditModalOpen(true);
  };

  const handleChangePassword = (colab: any) => {
    setSelectedColaborador(colab);
    setSenhaModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const viewModes: { id: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
    { id: "campo", label: "Campo", icon: LayoutGrid },
    { id: "lista", label: "Lista", icon: List },
    { id: "organograma", label: "Organograma", icon: GitBranch },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar membros..."
            className="pl-10 bg-background border-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {viewModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                    viewMode === mode.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              );
            })}
          </div>
          {isAdmin && (
            <Button variant="hero" size="sm" onClick={() => setNovoModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Novo Membro</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{colaboradores.length}</p>
          <p className="text-xs text-muted-foreground">Membros da Equipe</p>
        </div>
      </div>

      {/* Views */}
      {viewMode === "campo" && (
        <>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <CampoFutebol ref={fieldRef}>
              {filteredItems.map((colab) => (
                <ColaboradorFieldCard
                  key={colab.id}
                  colaborador={colab}
                  isAdmin={isAdmin}
                  onOpenDetail={handleOpenDetail}
                />
              ))}
            </CampoFutebol>
          </DndContext>
          {isAdmin && (
            <p className="text-xs text-muted-foreground text-center">
              Arraste os membros para reposicioná-los no campo
            </p>
          )}
        </>
      )}

      {viewMode === "lista" && (
        <ColaboradorListView
          colaboradores={filteredItems}
          onOpenDetail={handleOpenDetail}
        />
      )}

      {viewMode === "organograma" && (
        <OrganizerView
          colaboradores={filteredItems}
          isAdmin={isAdmin}
          onOpenDetail={handleOpenDetail}
          onRefresh={carregarColaboradores}
        />
      )}

      {/* Empty state */}
      {colaboradores.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum membro cadastrado ainda.</p>
          {isAdmin && (
            <Button className="mt-4" onClick={() => setNovoModalOpen(true)}>
              Adicionar Primeiro Membro
            </Button>
          )}
        </div>
      )}

      {/* Modals */}
      <ColaboradorDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        colaborador={selectedColaborador}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onChangePassword={handleChangePassword}
      />

      <NovoColaboradorModal
        open={novoModalOpen}
        onOpenChange={setNovoModalOpen}
        onSuccess={carregarColaboradores}
      />

      <EditarColaboradorModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        colaborador={selectedColaborador}
        onSuccess={carregarColaboradores}
      />

      <AlterarSenhaModal
        open={senhaModalOpen}
        onOpenChange={setSenhaModalOpen}
        colaborador={selectedColaborador}
        onSuccess={carregarColaboradores}
      />
    </div>
  );
};
