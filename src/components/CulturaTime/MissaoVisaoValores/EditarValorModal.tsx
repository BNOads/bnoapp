import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { iconMap, iconOptions } from "./iconMap";

interface EditarValorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  valor: any | null;
  onSuccess: () => void;
}

export const EditarValorModal = ({ open, onOpenChange, valor, onSuccess }: EditarValorModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [icone, setIcone] = useState("Star");

  useEffect(() => {
    if (valor) {
      setTitulo(valor.titulo || "");
      setDescricao(valor.descricao || "");
      setIcone(valor.icone || "Star");
    }
  }, [valor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor || !titulo.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("cultura_valores")
        .update({
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          icone,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("id", valor.id);

      if (error) throw error;

      toast({ title: "Valor atualizado!" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar valor",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Valor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Transparência"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva este valor..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="grid grid-cols-5 gap-2">
              {iconOptions.map((name) => {
                const Icon = iconMap[name];
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcone(name)}
                    className={`p-2 rounded-lg border flex items-center justify-center transition-colors ${
                      icone === name
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !titulo.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
