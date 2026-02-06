import { useDraggable } from "@dnd-kit/core";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Cake, GripVertical, Mail, Shield } from "lucide-react";
import { calcularDiasParaAniversario, formatarAniversario, formatarNivelAcesso } from "@/lib/dateUtils";

interface ColaboradorFieldCardProps {
  colaborador: {
    id: string;
    nome: string;
    avatar_url: string | null;
    cargo_display: string | null;
    nivel_acesso: string;
    email?: string;
    data_nascimento: string | null;
    ativo: boolean;
    campo_pos_x: number | null;
    campo_pos_y: number | null;
  };
  isAdmin: boolean;
  onOpenDetail: (colaborador: any) => void;
}

export const ColaboradorFieldCard = ({ colaborador, isAdmin, onOpenDetail }: ColaboradorFieldCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: colaborador.id,
    disabled: !isAdmin,
  });

  const diasAniversario = calcularDiasParaAniversario(colaborador.data_nascimento);
  const isAniversarioProximo = diasAniversario !== null && diasAniversario >= 0 && diasAniversario <= 7;
  const isAniversarioHoje = diasAniversario === 0;
  const firstName = colaborador.nome.split(" ")[0];
  const initials = colaborador.nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2);
  const cargoDisplay = colaborador.cargo_display || formatarNivelAcesso(colaborador.nivel_acesso);

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${colaborador.campo_pos_x ?? 50}%`,
    top: `${colaborador.campo_pos_y ?? 50}%`,
    transform: transform
      ? `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px))`
      : "translate(-50%, -50%)",
    zIndex: isDragging ? 50 : 10,
    cursor: isAdmin ? "grab" : "pointer",
    opacity: isDragging ? 0.8 : 1,
    transition: isDragging ? "none" : "box-shadow 0.2s",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group"
      onClick={() => !isDragging && onOpenDetail(colaborador)}
      {...(isAdmin ? { ...attributes, ...listeners } : {})}
    >
      <div
        className={`flex flex-col items-center gap-1 ${
          isAniversarioHoje ? "animate-pulse" : ""
        }`}
      >
        {/* Info Panel - Acima da foto */}
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1.5 max-w-[110px] sm:max-w-[140px] text-center">
          {/* Nome e Cargo */}
          <p className="text-xs sm:text-sm font-semibold text-white truncate">
            {colaborador.nome}
          </p>
          <p className="text-[10px] sm:text-xs text-blue-300 truncate">
            {cargoDisplay}
          </p>
          
          {/* Email */}
          {colaborador.email && (
            <div className="flex items-center justify-center gap-0.5 mt-0.5 text-[9px] sm:text-[10px] text-gray-200">
              <Mail className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{colaborador.email}</span>
            </div>
          )}
          
          {/* Nível de Acesso */}
          <div className="flex items-center justify-center gap-0.5 mt-0.5 text-[9px] sm:text-[10px] text-gray-300">
            <Shield className="h-2.5 w-2.5 flex-shrink-0" />
            <span className="truncate capitalize">{formatarNivelAcesso(colaborador.nivel_acesso)}</span>
          </div>
          
          {/* Data de Nascimento */}
          {colaborador.data_nascimento && (
            <div className={`flex items-center justify-center gap-0.5 mt-0.5 text-[9px] sm:text-[10px] ${
              isAniversarioProximo ? "text-yellow-300" : "text-gray-300"
            }`}>
              <Cake className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{formatarAniversario(colaborador.data_nascimento)}</span>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="relative">
          <Avatar
            className={`h-10 w-10 sm:h-12 sm:w-12 ring-2 shadow-md ${
              !colaborador.ativo
                ? "ring-gray-400 opacity-60"
                : isAniversarioProximo
                ? "ring-yellow-400"
                : "ring-white"
            }`}
          >
            {colaborador.avatar_url && (
              <AvatarImage src={colaborador.avatar_url} alt={colaborador.nome} />
            )}
            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Birthday badge */}
          {isAniversarioProximo && (
            <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5">
              <Cake className="h-3 w-3 text-yellow-800" />
            </div>
          )}

          {/* Admin drag handle - visible on hover */}
          {isAdmin && (
            <div className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-0.5 shadow">
              <GripVertical className="h-3 w-3 text-gray-500" />
            </div>
          )}
        </div>

        {/* Name label - Abaixo da foto */}
        <div className="bg-black/60 backdrop-blur-sm rounded-md px-2 py-0.5 max-w-[80px] sm:max-w-[100px]">
          <p className="text-[10px] sm:text-xs text-white font-medium text-center truncate">
            {firstName}
          </p>
          {colaborador.cargo_display && (
            <p className="text-[8px] sm:text-[10px] text-white/70 text-center truncate">
              {colaborador.cargo_display}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
