import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Cake, Briefcase, Edit, Key, User } from "lucide-react";
import { formatarAniversario, formatarNivelAcesso } from "@/lib/dateUtils";

interface ColaboradorDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: any | null;
  isAdmin: boolean;
  onEdit: (colaborador: any) => void;
  onChangePassword: (colaborador: any) => void;
}

export const ColaboradorDetailModal = ({
  open,
  onOpenChange,
  colaborador,
  isAdmin,
  onEdit,
  onChangePassword,
}: ColaboradorDetailModalProps) => {
  if (!colaborador) return null;

  const initials = colaborador.nome
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2);

  const cargoDisplay = colaborador.cargo_display || formatarNivelAcesso(colaborador.nivel_acesso);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Detalhes do membro</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center text-center space-y-4">
          {/* Avatar */}
          <Avatar className="h-20 w-20 ring-4 ring-primary/20">
            {colaborador.avatar_url && (
              <AvatarImage src={colaborador.avatar_url} alt={colaborador.nome} />
            )}
            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Name & Role */}
          <div>
            <h3 className="text-xl font-bold text-foreground">{colaborador.nome}</h3>
            <p className="text-sm font-medium text-primary">{cargoDisplay}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  colaborador.ativo ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {colaborador.ativo ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>

          {/* Info cards */}
          <div className="w-full space-y-2">
            {/* Email */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Mail className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-sm text-foreground truncate">{colaborador.email}</p>
            </div>

            {/* Birthday */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Cake className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Aniversário</p>
                <p className="text-sm font-medium text-foreground">
                  {formatarAniversario(colaborador.data_nascimento)}
                </p>
              </div>
            </div>

            {/* Mini Bio */}
            {colaborador.mini_bio && (
              <div className="p-3 bg-muted/30 rounded-lg text-left">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-muted-foreground font-medium">Sobre</p>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{colaborador.mini_bio}</p>
              </div>
            )}

            {/* Responsabilidades */}
            {colaborador.responsabilidades && (
              <div className="p-3 bg-muted/30 rounded-lg text-left">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-muted-foreground font-medium">Responsabilidades</p>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {colaborador.responsabilidades}
                </p>
              </div>
            )}
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex gap-2 w-full pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  onEdit(colaborador);
                  onOpenChange(false);
                }}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  onChangePassword(colaborador);
                  onOpenChange(false);
                }}
              >
                <Key className="h-4 w-4 mr-1" />
                Alterar Senha
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
