import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, X, Eye } from "lucide-react";
import { MarkdownEditor } from "./MarkdownEditor/MarkdownEditor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReferencesEditorProps {
  isOpen: boolean;
  onClose: () => void;
  referenceId?: string | null;
  clienteId: string;
  onSave?: () => void;
}

export const ReferencesEditor = ({ 
  isOpen, 
  onClose, 
  referenceId, 
  clienteId,
  onSave 
}: ReferencesEditorProps) => {
  const [loading, setLoading] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [formData, setFormData] = useState({
    titulo: "",
    categoria: "criativos" as "criativos" | "pagina",
    is_template: false,
    link_publico: ""
  });

  const { toast } = useToast();

  // Carregar dados da referência se estiver editando
  useEffect(() => {
    if (referenceId && isOpen) {
      loadReference();
    } else if (isOpen) {
      resetForm();
    }
  }, [referenceId, isOpen]);

  const loadReference = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referencias_criativos')
        .select('*')
        .eq('id', referenceId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          title: "Erro",
          description: "Referência não encontrada.",
          variant: "destructive"
        });
        return;
      }

      setFormData({
        titulo: data.titulo,
        categoria: data.categoria as "criativos" | "pagina",
        is_template: data.is_template,
        link_publico: data.link_publico || ""
      });

      // Converter conteúdo para markdown
      if ((data as any).conteudo_markdown) {
        setMarkdownContent((data as any).conteudo_markdown);
      } else if (data.conteudo && Array.isArray(data.conteudo)) {
        // Migração do formato antigo - converter blocos para markdown
        let markdown = '';
        data.conteudo.forEach((item: any) => {
          switch (item.tipo) {
            case 'heading':
              const level = '#'.repeat(item.level || 1);
              markdown += `${level} ${item.conteudo}\n\n`;
              break;
            case 'text':
              markdown += `${item.conteudo}\n\n`;
              break;
            case 'image':
              markdown += `![${item.descricao || ''}](${item.url})\n\n`;
              break;
            case 'link':
              markdown += `[${item.titulo || item.conteudo}](${item.url})\n\n`;
              break;
            case 'checklist':
              const checked = item.checked ? 'x' : ' ';
              markdown += `- [${checked}] ${item.conteudo}\n`;
              break;
            default:
              markdown += `${item.conteudo}\n\n`;
          }
        });
        setMarkdownContent(markdown);
      } else {
        setMarkdownContent('');
      }
    } catch (error) {
      console.error('Erro ao carregar referência:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a referência.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: "",
      categoria: "criativos",
      is_template: false,
      link_publico: ""
    });
    setMarkdownContent('');
  };

  const handleSave = async () => {
    if (!formData.titulo.trim()) {
      toast({
        title: "Erro",
        description: "O título é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const dataToSave = {
        titulo: formData.titulo,
        categoria: formData.categoria,
        is_template: formData.is_template,
        conteudo_markdown: markdownContent,
        cliente_id: clienteId === 'geral' ? null : clienteId,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      let result;
      if (referenceId) {
        result = await supabase
          .from('referencias_criativos')
          .update(dataToSave)
          .eq('id', referenceId);
      } else {
        result = await supabase
          .from('referencias_criativos')
          .insert([dataToSave]);
      }

      if (result.error) throw result.error;

      toast({
        title: "✔ Salvo",
        description: referenceId ? "Referência atualizada!" : "Referência criada!",
      });

      // Recarregar dados sem fechar o modal
      if (referenceId) {
        await loadReference();
      }
      
      onSave?.();
      // Modal permanece aberto - usuário fecha manualmente
    } catch (error) {
      console.error('Erro ao salvar referência:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a referência.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevenir fechamento ao clicar fora ou pressionar ESC durante salvamento
      if (!open && loading) return;
      onClose();
    }}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col" onInteractOutside={(e) => {
        // Bloquear fechamento ao clicar fora durante salvamento
        if (loading) e.preventDefault();
      }} onEscapeKeyDown={(e) => {
        // Bloquear fechamento ao pressionar ESC durante salvamento
        if (loading) e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle>
            {referenceId ? "Editar Referência" : "Nova Referência"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-6">
          {/* Configurações */}
          <div className="w-80 space-y-4 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Título da referência"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select 
                    value={formData.categoria} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, categoria: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="criativos">Criativos</SelectItem>
                      <SelectItem value="pagina">Página</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-y-auto">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Conteúdo
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full overflow-y-auto p-0">
                <MarkdownEditor
                  content={markdownContent}
                  onChange={setMarkdownContent}
                  onSave={handleSave}
                  autoSave={true}
                  className="border-none"
                  visualOnly={true}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};