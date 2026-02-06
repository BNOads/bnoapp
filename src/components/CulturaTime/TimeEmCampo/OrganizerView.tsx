import { useState, useRef, useCallback } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Edit, Cake, GripVertical } from "lucide-react";
import { formatarNivelAcesso, calcularDiasParaAniversario } from "@/lib/dateUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDraggable, useDroppable, DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";

// Hierarquia de níveis de acesso para o organograma
const HIERARQUIA: Record<string, number> = {
  dono: 0,
  admin: 1,
  gestor_trafego: 2,
  gestor_projetos: 2,
  cs: 3,
  midia_buyer: 3,
  copywriter: 3,
  designer: 3,
  webdesigner: 3,
  editor_video: 3,
};

const NIVEL_LABELS: Record<number, string> = {
  0: "Diretoria",
  1: "Administração",
  2: "Gestão de Tráfego",
  3: "Equipe",
};

// Subdivisão da equipe (níveis 3) em departamentos
const DEPARTAMENTOS: Record<string, string> = {
  cs: "Comunicação",
  copywriter: "Comunicação",
  designer: "Comunicação",
  editor_video: "Comunicação",
  midia_buyer: "Serviços",
  webdesigner: "Serviços",
};

interface OrganizerViewProps {
  colaboradores: any[];
  isAdmin: boolean;
  onOpenDetail: (colaborador: any) => void;
  onRefresh: () => void;
}

// Componente de nó individual do mapa mental
const OrganizerNode = ({ 
  colaborador, 
  isAdmin, 
  onOpenDetail, 
  onPositionChange,
  isDragging,
  onDepartmentChange
}: any) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: colaborador.id,
    disabled: !isAdmin,
  });
  const { setNodeRef: setDropRef, isOver: isOverDrop } = useDroppable({
    id: `drop-${colaborador.id}`,
  });

  const initials = colaborador.nome
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2);
  const cargoDisplay = colaborador.cargo_display || formatarNivelAcesso(colaborador.nivel_acesso);
  const diasAniversario = calcularDiasParaAniversario(colaborador.data_nascimento);
  const isAniversarioProximo = diasAniversario !== null && diasAniversario >= 0 && diasAniversario <= 7;
  const nivel = HIERARQUIA[colaborador.nivel_acesso] ?? 3;
  const departamento = DEPARTAMENTOS[colaborador.nivel_acesso] || "Serviços";

  const borderColor = 
    nivel === 0 ? "border-amber-500" :
    nivel === 1 ? "border-blue-500" :
    nivel === 2 ? "border-emerald-500" :
    departamento === "Comunicação" ? "border-purple-500" :
    "border-pink-500";

  const bgColor = 
    nivel === 0 ? "bg-amber-50 dark:bg-amber-950/20" :
    nivel === 1 ? "bg-blue-50 dark:bg-blue-950/20" :
    nivel === 2 ? "bg-emerald-50 dark:bg-emerald-950/20" :
    departamento === "Comunicação" ? "bg-purple-50 dark:bg-purple-950/20" :
    "bg-pink-50 dark:bg-pink-950/20";

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    cursor: isAdmin ? "grab" : "pointer",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative"
      {...(isAdmin ? { ...attributes, ...listeners } : {})}
    >
      <Card className={`w-48 border-2 ${borderColor} ${bgColor} shadow-lg hover:shadow-xl transition-shadow cursor-pointer relative`}>
        <div className="p-4" onClick={() => !isDragging && onOpenDetail(colaborador)}>
          {/* Header com nível/departamento */}
          <div className="flex items-start justify-between mb-3">
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
              nivel === 0 ? "bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100" :
              nivel === 1 ? "bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100" :
              nivel === 2 ? "bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100" :
              departamento === "Comunicação" ? "bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100" :
              "bg-pink-200 dark:bg-pink-800 text-pink-900 dark:text-pink-100"
            }`}>
              {nivel === 3 ? departamento : NIVEL_LABELS[nivel]}
            </span>
            {isAdmin && (
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
            )}
          </div>

          {/* Avatar */}
          <div className="flex justify-center mb-3 relative">
            <Avatar className="h-16 w-16 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ring-current">
              {colaborador.avatar_url && (
                <AvatarImage src={colaborador.avatar_url} alt={colaborador.nome} />
              )}
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isAniversarioProximo && (
              <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1">
                <Cake className="h-3 w-3 text-yellow-900" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-sm text-foreground line-clamp-2">
              {colaborador.nome}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {cargoDisplay}
            </p>
            {colaborador.email && (
              <p className="text-[10px] text-muted-foreground/70 truncate">
                {colaborador.email}
              </p>
            )}
            {colaborador.data_nascimento && (
              <p className="text-[10px] text-muted-foreground/70">
                {new Date(colaborador.data_nascimento).toLocaleDateString("pt-BR", { month: "short", day: "numeric" })}
              </p>
            )}

            {/* Departamento selector - só para nível 3 (equipe) */}
            {isAdmin && nivel === 3 && (
              <div className="mt-2 pt-2 border-t border-current/10">
                <select
                  value={departamento}
                  onChange={(e) => onDepartmentChange(colaborador.id, e.target.value)}
                  className="w-full text-[10px] px-2 py-1 rounded bg-white/50 dark:bg-white/10 border border-current/20 cursor-pointer hover:bg-white/70 dark:hover:bg-white/20 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="Comunicação">📢 Comunicação</option>
                  <option value="Serviços">⚙️ Serviços</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export const OrganizerView = ({ colaboradores, isAdmin, onOpenDetail, onRefresh }: OrganizerViewProps) => {
  const { toast } = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Agrupar por nível hierárquico
  const grupos = colaboradores.reduce<Record<number, any[]>>((acc, colab) => {
    const nivel = HIERARQUIA[colab.nivel_acesso] ?? 3;
    if (!acc[nivel]) acc[nivel] = [];
    acc[nivel].push(colab);
    return acc;
  }, {});

  const niveisOrdenados = Object.keys(grupos)
    .map(Number)
    .sort((a, b) => a - b);

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggedItem(null);
  };

  const handleDepartmentChange = async (colaboradorId: string, novoDepartamento: string) => {
    // Encontrar o tipo de cargo baseado no departamento
    const colaborador = colaboradores.find(c => c.id === colaboradorId);
    if (!colaborador) return;

    const cargosPorDepartamento: Record<string, string[]> = {
      "Comunicação": ["cs", "copywriter", "designer", "editor_video"],
      "Serviços": ["midia_buyer", "webdesigner"],
    };

    // Se já está em um cargo do departamento correto, não fazer nada
    const cargoAtual = colaborador.nivel_acesso;
    if (cargosPorDepartamento[novoDepartamento]?.includes(cargoAtual)) {
      return;
    }

    // Tentar manter o cargo, ou pegar o primeiro cargo disponível do novo departamento
    let nevoCargoAtribuído = cargosPorDepartamento[novoDepartamento]?.[0] || cargoAtual;

    try {
      const { error } = await supabase
        .from("colaboradores")
        .update({ nivel_acesso: nevoCargoAtribuído as any })
        .eq("id", colaboradorId);

      if (error) throw error;

      toast({ 
        title: "Departamento atualizado!", 
        description: `${colaborador.nome} movido para ${novoDepartamento}` 
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const renderNivel = (nivel: number, membros: any[]) => {
    const label = NIVEL_LABELS[nivel] || `Nível ${nivel}`;
    const borderColor = 
      nivel === 0 ? "from-amber-500" :
      nivel === 1 ? "from-blue-500" :
      nivel === 2 ? "from-emerald-500" :
      "from-purple-500";

    // Se é nível 3 (equipe), retornar null para processar depois junto
    if (nivel === 3) return null;

    return (
      <div key={nivel} className="space-y-4">
        {/* Nível header com linha visual */}
        <div className="flex items-center gap-3">
          <div className={`h-1 flex-1 bg-gradient-to-r ${borderColor} to-transparent rounded-full`} />
          <h2 className="font-bold text-lg text-foreground whitespace-nowrap">
            {label}
          </h2>
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {membros.length} {membros.length === 1 ? "pessoa" : "pessoas"}
          </span>
        </div>

        {/* Membros em grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {membros.map((colab: any) => (
            <OrganizerNode
              key={colab.id}
              colaborador={colab}
              isAdmin={isAdmin}
              onOpenDetail={onOpenDetail}
              onPositionChange={() => {}}
              isDragging={draggedItem === colab.id}
              onDepartmentChange={handleDepartmentChange}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-8">
        {/* Diretoria e Administração */}
        {niveisOrdenados.filter(n => n <= 1).map(nivel => renderNivel(nivel, grupos[nivel]))}

        {/* Gestão na mesma linha que Comunicação e Serviços */}
        {grupos[2] && (
          <div className="space-y-8">
            {/* Linha com Gestão, Comunicação, Serviços lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Gestão */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="font-bold text-lg text-foreground">Gestão de Tráfego</h3>
                  <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {grupos[2].length}
                  </span>
                </div>
                <div className="space-y-3">
                  {grupos[2].map((colab: any) => (
                    <OrganizerNode
                      key={colab.id}
                      colaborador={colab}
                      isAdmin={isAdmin}
                      onOpenDetail={onOpenDetail}
                      onPositionChange={() => {}}
                      isDragging={draggedItem === colab.id}
                      onDepartmentChange={handleDepartmentChange}
                    />
                  ))}
                </div>
              </div>

              {/* Comunicação e Serviços */}
              {grupos[3] && (
                <>
                  {/* Comunicação */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <h3 className="font-bold text-lg text-foreground">📢 Comunicação</h3>
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {grupos[3].filter(c => DEPARTAMENTOS[c.nivel_acesso] === "Comunicação").length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {grupos[3]
                        .filter(c => DEPARTAMENTOS[c.nivel_acesso] === "Comunicação")
                        .map((colab: any) => (
                          <OrganizerNode
                            key={colab.id}
                            colaborador={colab}
                            isAdmin={isAdmin}
                            onOpenDetail={onOpenDetail}
                            onPositionChange={() => {}}
                            isDragging={draggedItem === colab.id}
                            onDepartmentChange={handleDepartmentChange}
                          />
                        ))}
                    </div>
                  </div>

                  {/* Serviços */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-pink-500" />
                      <h3 className="font-bold text-lg text-foreground">⚙️ Serviços</h3>
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {grupos[3].filter(c => DEPARTAMENTOS[c.nivel_acesso] === "Serviços").length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {grupos[3]
                        .filter(c => DEPARTAMENTOS[c.nivel_acesso] === "Serviços")
                        .map((colab: any) => (
                          <OrganizerNode
                            key={colab.id}
                            colaborador={colab}
                            isAdmin={isAdmin}
                            onOpenDetail={onOpenDetail}
                            onPositionChange={() => {}}
                            isDragging={draggedItem === colab.id}
                            onDepartmentChange={handleDepartmentChange}
                          />
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {colaboradores.length === 0 && (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">Nenhum membro cadastrado ainda.</p>
          </div>
        )}
      </div>
    </DndContext>
  );
};
