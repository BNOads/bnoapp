import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Bot, FileText, Upload } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
}

export function ImportarAnotacoesGemini() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [formData, setFormData] = useState({
    titulo: "",
    clienteId: "",
    clienteNome: "",
    anotacoes: "",
    meetingUrl: "",
    documentUrl: "",
    dataReuniao: ""
  });

  // Carregar clientes quando abrir o modal
  const carregarClientes = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');
    
    if (error) {
      console.error('Erro ao carregar clientes:', error);
      return;
    }
    
    setClientes(data || []);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      carregarClientes();
    }
  };

  const handleImportFromDocs = async () => {
    if (!formData.documentUrl) {
      toast.error("Cole a URL do Google Docs primeiro");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('sincronizar-docs-gemini', {
        body: { url: formData.documentUrl }
      });

      if (error) throw error;

      if (data.requiresManualInput) {
        toast.warning("Por favor, copie e cole o conteúdo manualmente do documento");
        return;
      }

      toast.success(`Documento importado com sucesso! ${data.message}`);
      setOpen(false);
      
    } catch (error) {
      console.error('Erro ao importar do Google Docs:', error);
      toast.error("Erro ao importar documento. Tente colar o conteúdo manualmente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.anotacoes.trim()) {
      toast.error("As anotações são obrigatórias");
      return;
    }

    setLoading(true);

    try {
      // Buscar nome do cliente se ID foi selecionado
      const clienteNome = formData.clienteId 
        ? clientes.find(c => c.id === formData.clienteId)?.nome || formData.clienteNome
        : formData.clienteNome;

      const { data, error } = await supabase.functions.invoke('capturar-anotacoes-gemini', {
        body: {
          titulo: formData.titulo || undefined,
          clienteNome: clienteNome || undefined,
          anotacoes: formData.anotacoes,
          meetingUrl: formData.meetingUrl || undefined,
          documentUrl: formData.documentUrl || undefined,
          dataReuniao: formData.dataReuniao || undefined
        }
      });

      if (error) throw error;

      const actionText = data.action === 'updated' 
        ? 'atualizadas na gravação existente' 
        : 'salvas em nova gravação';
      
      toast.success(`Anotações do Gemini ${actionText} com sucesso!`);
      
      // Reset form
      setFormData({
        titulo: "",
        clienteId: "",
        clienteNome: "",
        anotacoes: "",
        meetingUrl: "",
        documentUrl: "",
        dataReuniao: ""
      });
      
      setOpen(false);
      
    } catch (error) {
      console.error('Erro ao importar anotações:', error);
      toast.error("Erro ao importar anotações do Gemini");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 flex-1 xs:flex-none text-xs sm:text-sm">
          <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="truncate">Anotações Gemini</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar Anotações do Gemini
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título (Opcional)</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Reunião de Alinhamento - Cliente X"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataReuniao">Data da Reunião (Opcional)</Label>
              <Input
                id="dataReuniao"
                type="datetime-local"
                value={formData.dataReuniao}
                onChange={(e) => setFormData(prev => ({ ...prev, dataReuniao: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Select
                value={formData.clienteId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, clienteId: value, clienteNome: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Ou digite o nome do cliente"
                value={formData.clienteNome}
                onChange={(e) => setFormData(prev => ({ ...prev, clienteNome: e.target.value, clienteId: "" }))}
                disabled={!!formData.clienteId}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meetingUrl">URL do Google Meet (Opcional)</Label>
              <Input
                id="meetingUrl"
                value={formData.meetingUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, meetingUrl: e.target.value }))}
                placeholder="https://meet.google.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentUrl">URL do Documento (Opcional)</Label>
              <Input
                id="documentUrl"
                value={formData.documentUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, documentUrl: e.target.value }))}
                placeholder="https://docs.google.com/document/..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="anotacoes">Anotações do Gemini *</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Cole a URL do Google Docs aqui para importar automaticamente"
                  value={formData.documentUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentUrl: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleImportFromDocs}
                  disabled={!formData.documentUrl || loading}
                >
                  Importar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ou cole o conteúdo manualmente abaixo:
              </p>
            </div>
            <Textarea
              id="anotacoes"
              value={formData.anotacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, anotacoes: e.target.value }))}
              placeholder="Cole aqui as anotações geradas pelo Gemini durante a reunião..."
              rows={12}
              className="min-h-[300px]"
              required
            />
            <p className="text-sm text-muted-foreground">
              Cole as anotações completas geradas pelo Gemini. Elas serão processadas automaticamente 
              para extrair resumos, palavras-chave e compromissos.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.anotacoes.trim()}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Upload className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar Anotações
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}