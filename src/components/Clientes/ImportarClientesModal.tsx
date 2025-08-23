import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImportarClientesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ImportarClientesModal = ({ 
  open, 
  onOpenChange, 
  onSuccess 
}: ImportarClientesModalProps) => {
  const [csvData, setCsvData] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const processarCSV = (texto: string) => {
    const linhas = texto.trim().split('\n');
    const cabecalho = linhas[0].split(',').map(col => col.trim());
    
    return linhas.slice(1).map(linha => {
      const valores = linha.split(',').map(val => val.trim());
      const objeto: any = {};
      
      cabecalho.forEach((campo, index) => {
        let valor = valores[index] || '';
        
        // Remover aspas se existirem
        if (valor.startsWith('"') && valor.endsWith('"')) {
          valor = valor.slice(1, -1);
        }
        
        // Mapear campos do CSV para campos da tabela
        switch (campo.toLowerCase()) {
          case 'nome':
            objeto.nome = valor;
            break;
          case 'categoria':
            objeto.categoria = valor === 'infoproduto' ? 'infoproduto' : 'negocio_local';
            break;
          case 'nicho':
            objeto.nicho = valor;
            break;
          case 'etapa':
          case 'etapa_atual':
            objeto.etapa_atual = valor;
            break;
          case 'observacoes':
            objeto.observacoes = valor;
            break;
          case 'pasta_drive_url':
            objeto.pasta_drive_url = valor;
            break;
          case 'whatsapp_grupo_url':
            objeto.whatsapp_grupo_url = valor;
            break;
          case 'drive_folder_id':
            objeto.drive_folder_id = valor;
            break;
        }
      });
      
      return objeto;
    });
  };

  const handleImport = async () => {
    if (!csvData.trim()) {
      toast({
        title: "Dados obrigatórios",
        description: "Por favor, cole os dados CSV para importar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const clientes = processarCSV(csvData);
      
      // Adicionar campos obrigatórios
      const clientesComCampos = clientes.map(cliente => ({
        ...cliente,
        created_by: user.id,
        ativo: true,
        progresso_etapa: 0,
        total_acessos: 0,
      }));

      const { error } = await supabase
        .from('clientes')
        .insert(clientesComCampos);

      if (error) {
        throw error;
      }

      toast({
        title: "Importação concluída",
        description: `${clientes.length} cliente(s) importado(s) com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
      setCsvData('');
    } catch (error: any) {
      console.error('Erro ao importar clientes:', error);
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exemploCSV = `nome,categoria,nicho,etapa_atual,observacoes,pasta_drive_url
"Cliente Exemplo 1",infoproduto,"Marketing Digital",ativo,"Cliente em fase de implantação","https://drive.google.com/..."
"Cliente Exemplo 2",negocio_local,"Restaurante",negociacao,"Aguardando proposta",""`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-primary" />
            <DialogTitle>Importar Clientes em Massa</DialogTitle>
          </div>
          <DialogDescription>
            Importe múltiplos clientes usando dados em formato CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Formato esperado:</strong> Cole os dados CSV com as colunas separadas por vírgula. 
              A primeira linha deve conter os nomes das colunas.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="csv-data">Dados CSV</Label>
            <Textarea
              id="csv-data"
              placeholder="Cole aqui os dados CSV..."
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Exemplo de formato CSV:</span>
            </Label>
            <div className="bg-muted p-3 rounded-md">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                {exemploCSV}
              </pre>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Colunas disponíveis:</strong> nome*, categoria*, nicho, etapa_atual, observacoes, pasta_drive_url, whatsapp_grupo_url, drive_folder_id
              <br />
              <small>* Campos obrigatórios</small>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Importando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Importar Clientes</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};