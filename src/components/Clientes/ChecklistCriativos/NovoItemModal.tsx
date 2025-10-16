import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink } from "lucide-react";

interface NovoItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistId: string;
  onSuccess: () => void;
}

export const NovoItemModal = ({ open, onOpenChange, checklistId, onSuccess }: NovoItemModalProps) => {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [formato, setFormato] = useState("");
  const [especificacoes, setEspecificacoes] = useState("");
  const [referencias, setReferencias] = useState<string[]>([]);
  const [referenciasDisponiveis, setReferenciasDisponiveis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadReferencias();
    }
  }, [open]);

  const loadReferencias = async () => {
    try {
      const { data, error } = await supabase
        .from('referencias_criativos')
        .select('id, titulo, link_url')
        .eq('ativo', true)
        .order('titulo');

      if (error) throw error;
      setReferenciasDisponiveis(data || []);
    } catch (error) {
      console.error('Erro ao carregar referências:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !tipo) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o título e o tipo do item",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Obter o próximo número de ordem
      const { data: existingItems } = await supabase
        .from('checklist_criativos_itens')
        .select('ordem')
        .eq('checklist_id', checklistId)
        .order('ordem', { ascending: false })
        .limit(1);

      const nextOrdem = existingItems && existingItems.length > 0 
        ? existingItems[0].ordem + 1 
        : 0;

      const { error } = await supabase
        .from('checklist_criativos_itens')
        .insert({
          checklist_id: checklistId,
          titulo: titulo.trim(),
          tipo,
          formato: formato.trim() || null,
          especificacoes: especificacoes.trim() || null,
          ordem: nextOrdem,
          referencias: referencias
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item adicionado com sucesso"
      });
      
      setTitulo("");
      setTipo("");
      setQuantidade("1");
      setFormato("");
      setEspecificacoes("");
      setReferencias([]);
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar item:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar item",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Item do Checklist</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título do Item *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: 2 Criativos Segmentados por Região"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="imagem">Imagem</SelectItem>
                <SelectItem value="texto">Texto</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade *</Label>
            <Select value={quantidade} onValueChange={setQuantidade} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a quantidade" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? 'criativo' : 'criativos'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Formato</Label>
            <RadioGroup value={formato} onValueChange={setFormato}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1x1" id="formato-1x1" />
                <Label htmlFor="formato-1x1" className="font-normal cursor-pointer">1x1 (Feed)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="9x16" id="formato-9x16" />
                <Label htmlFor="formato-9x16" className="font-normal cursor-pointer">9x16 (Stories)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1x1,9x16" id="formato-ambos" />
                <Label htmlFor="formato-ambos" className="font-normal cursor-pointer">1x1 e 9x16 (Feed e Stories)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="16x9" id="formato-16x9" />
                <Label htmlFor="formato-16x9" className="font-normal cursor-pointer">16x9 (Landscape)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="outro" id="formato-outro" />
                <Label htmlFor="formato-outro" className="font-normal cursor-pointer">Outro</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="especificacoes">Especificações</Label>
            <Textarea
              id="especificacoes"
              value={especificacoes}
              onChange={(e) => setEspecificacoes(e.target.value)}
              placeholder="Ex: Atenção Arquitetos de SP e RJ"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Referências (opcional)</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
              {referenciasDisponiveis.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhuma referência disponível
                </p>
              ) : (
                referenciasDisponiveis.map((ref) => (
                  <label
                    key={ref.id}
                    className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={referencias.includes(ref.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setReferencias([...referencias, ref.id]);
                        } else {
                          setReferencias(referencias.filter(id => id !== ref.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ref.titulo}</p>
                      {ref.link_url && (
                        <a
                          href={ref.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ver referência <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
            {referencias.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {referencias.length} {referencias.length === 1 ? 'referência selecionada' : 'referências selecionadas'}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Adicionando..." : "Adicionar Item"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
