import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Mail, Cake } from "lucide-react";
import { formatarAniversario, calcularDiasParaAniversario, formatarNivelAcesso } from "@/lib/dateUtils";

interface ColaboradorListViewProps {
  colaboradores: any[];
  onOpenDetail: (colaborador: any) => void;
}

export const ColaboradorListView = ({ colaboradores, onOpenDetail }: ColaboradorListViewProps) => {
  if (colaboradores.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">Nenhum membro encontrado.</p>
      </div>
    );
  }

  return (
    <Card className="bg-card border border-border overflow-hidden">
      <div className="divide-y divide-border">
        {colaboradores.map((colab) => {
          const diasAniversario = calcularDiasParaAniversario(colab.data_nascimento);
          const isAniversarioProximo = diasAniversario !== null && diasAniversario >= 0 && diasAniversario <= 7;
          const initials = colab.nome
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .substring(0, 2);
          const cargoDisplay = colab.cargo_display || formatarNivelAcesso(colab.nivel_acesso);

          return (
            <div
              key={colab.id}
              onClick={() => onOpenDetail(colab)}
              className={`flex items-center gap-4 p-4 hover:bg-muted/30 cursor-pointer transition-colors ${
                isAniversarioProximo ? "bg-yellow-50/50" : ""
              }`}
            >
              {/* Avatar */}
              <Avatar className="h-10 w-10 ring-2 ring-border flex-shrink-0">
                {colab.avatar_url && (
                  <AvatarImage src={colab.avatar_url} alt={colab.nome} />
                )}
                <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-foreground text-sm truncate">{colab.nome}</h4>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colab.ativo ? "bg-green-500" : "bg-gray-400"}`} />
                </div>
                <p className="text-xs text-primary font-medium truncate">{cargoDisplay}</p>
              </div>

              {/* Email */}
              <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground min-w-0 max-w-[200px]">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-xs truncate">{colab.email}</span>
              </div>

              {/* Birthday */}
              <div className={`hidden md:flex items-center gap-1.5 min-w-[100px] ${
                isAniversarioProximo ? "text-yellow-600" : "text-muted-foreground"
              }`}>
                <Cake className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-xs">{formatarAniversario(colab.data_nascimento)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
