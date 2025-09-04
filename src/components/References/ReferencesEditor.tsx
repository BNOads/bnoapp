import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, X, Eye, Copy, ExternalLink } from "lucide-react";
import { NotionEditor } from "./NotionEditor/NotionEditor";
import { EditorBlock } from "./NotionEditor/types";
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
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [formData, setFormData] = useState({
    titulo: "",
    categoria: "infoproduto" as "infoproduto" | "negocio_local" | "pagina",
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
        .single();

      if (error) throw error;

      setFormData({
        titulo: data.titulo,
        categoria: data.categoria as "infoproduto" | "negocio_local" | "pagina",
        is_template: data.is_template,
        link_publico: data.link_publico || ""
      });

      // Converter conteúdo para blocos do editor
      if (data.conteudo && Array.isArray(data.conteudo)) {
        const convertedBlocks: EditorBlock[] = data.conteudo.map((item: any, index: number) => ({
          id: item.id || `block-${index}`,
          type: item.tipo || 'text',
          content: {
            text: item.conteudo,
            url: item.url,
            caption: item.descricao,
            title: item.titulo,
            level: item.level,
            checked: item.checked
          },
          order: index,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        setBlocks(convertedBlocks);
      } else {
        setBlocks([]);
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
      categoria: "infoproduto",
      is_template: false,
      link_publico: ""
    });
    setBlocks([]);
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

      // Converter blocos para formato antigo do banco
      const conteudo = blocks.map(block => ({
        id: block.id,
        tipo: block.type,
        conteudo: block.content.text || '',
        url: block.content.url || '',
        titulo: block.content.title || '',
        descricao: block.content.caption || '',
        level: block.content.level,
        checked: block.content.checked
      }));

      const dataToSave = {
        titulo: formData.titulo,
        categoria: formData.categoria,
        is_template: formData.is_template,
        conteudo: conteudo,
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
        title: "Sucesso",
        description: referenceId ? "Referência atualizada!" : "Referência criada!",
      });

      onSave?.();
      onClose();
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

  const copyPublicLink = () => {
    if (formData.link_publico) {
      navigator.clipboard.writeText(formData.link_publico);
      toast({
        title: "Link copiado",
        description: "Link público copiado para a área de transferência!",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
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
                      <SelectItem value="infoproduto">Infoproduto</SelectItem>
                      <SelectItem value="negocio_local">Negócio Local</SelectItem>
                      <SelectItem value="pagina">Página</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="template"
                    checked={formData.is_template}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_template: checked }))}
                  />
                  <Label htmlFor="template">Usar como template</Label>
                </div>

                {formData.link_publico && (
                  <div className="space-y-2">
                    <Label>Link Público</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={copyPublicLink}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(formData.link_publico, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
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
              <CardContent className="h-full overflow-y-auto">
                <NotionEditor
                  blocks={blocks}
                  onChange={setBlocks}
                  className="min-h-[400px]"
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