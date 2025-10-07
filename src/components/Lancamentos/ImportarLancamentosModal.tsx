import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportarLancamentosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportacaoConcluida: () => void;
}

interface LancamentoCSV {
  nome_lancamento: string;
  descricao?: string;
  tipo_lancamento: string;
  data_inicio_captacao: string;
  data_fim_captacao?: string;
  investimento_total: string;
  link_dashboard?: string;
  link_briefing?: string;
  observacoes?: string;
}

const ImportarLancamentosModal: React.FC<ImportarLancamentosModalProps> = ({
  open,
  onOpenChange,
  onImportacaoConcluida
}) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dadosPreview, setDadosPreview] = useState<LancamentoCSV[]>([]);
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState<'upload' | 'preview' | 'resultado'>('upload');
  const [resultado, setResultado] = useState<{
    sucessos: number;
    erros: string[];
  }>({ sucessos: 0, erros: [] });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setArquivo(file);
      processarArquivo(file);
    }
  };

  const processarArquivo = async (file: File) => {
    try {
      const text = await file.text();
      const linhas = text.split('\n').filter(linha => linha.trim());
      
      if (linhas.length < 2) {
        throw new Error('Arquivo deve conter pelo menos o cabeçalho e uma linha de dados');
      }

      const cabecalho = linhas[0].split(',').map(col => col.trim().replace(/"/g, ''));
      const dados: LancamentoCSV[] = [];

      // Mapear colunas esperadas
      const colunasEsperadas = {
        nome_lancamento: ['nome_lancamento', 'nome', 'lancamento'],
        descricao: ['descricao', 'descrição'],
        tipo_lancamento: ['tipo_lancamento', 'tipo'],
        data_inicio_captacao: ['data_inicio_captacao', 'data_inicio', 'inicio'],
        data_fim_captacao: ['data_fim_captacao', 'data_fim', 'fim'],
        investimento_total: ['investimento_total', 'investimento', 'valor'],
        link_dashboard: ['link_dashboard', 'dashboard'],
        link_briefing: ['link_briefing', 'briefing'],
        observacoes: ['observacoes', 'observações', 'obs']
      };

      // Encontrar índices das colunas
      const indices: { [key: string]: number } = {};
      Object.entries(colunasEsperadas).forEach(([campo, possiveisNomes]) => {
        const index = cabecalho.findIndex(col => 
          possiveisNomes.some(nome => 
            col.toLowerCase().includes(nome.toLowerCase())
          )
        );
        if (index !== -1) {
          indices[campo] = index;
        }
      });

      // Verificar campos obrigatórios
      const camposObrigatorios = ['nome_lancamento', 'tipo_lancamento', 'data_inicio_captacao', 'investimento_total'];
      const camposFaltando = camposObrigatorios.filter(campo => indices[campo] === undefined);
      
      if (camposFaltando.length > 0) {
        throw new Error(`Campos obrigatórios não encontrados: ${camposFaltando.join(', ')}`);
      }

      // Processar dados
      for (let i = 1; i < linhas.length; i++) {
        const valores = linhas[i].split(',').map(val => val.trim().replace(/"/g, ''));
        
        const item: LancamentoCSV = {
          nome_lancamento: valores[indices.nome_lancamento] || '',
          descricao: valores[indices.descricao] || '',
          tipo_lancamento: valores[indices.tipo_lancamento] || '',
          data_inicio_captacao: valores[indices.data_inicio_captacao] || '',
          data_fim_captacao: valores[indices.data_fim_captacao] || '',
          investimento_total: valores[indices.investimento_total] || '0',
          link_dashboard: valores[indices.link_dashboard] || '',
          link_briefing: valores[indices.link_briefing] || '',
          observacoes: valores[indices.observacoes] || ''
        };

        dados.push(item);
      }

      setDadosPreview(dados);
      setEtapa('preview');

    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const validarEImportar = async () => {
    setLoading(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar clientes para identificação automática
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, slug, aliases, primary_gestor_user_id')
        .eq('ativo', true);

      const clientes = clientesData || [];

      let sucessos = 0;
      const erros: string[] = [];

      for (const [index, item] of dadosPreview.entries()) {
        try {
          // Validações
          if (!item.nome_lancamento.trim()) {
            throw new Error(`Linha ${index + 2}: Nome do lançamento é obrigatório`);
          }

          // Validar tipo de lançamento
          const tiposValidos = ['semente', 'interno', 'externo', 'perpetuo', 'flash', 'evento', 'outro'];
          if (!tiposValidos.includes(item.tipo_lancamento.toLowerCase())) {
            throw new Error(`Linha ${index + 2}: Tipo "${item.tipo_lancamento}" inválido`);
          }

          // Validar data
          const dataInicio = new Date(item.data_inicio_captacao);
          if (isNaN(dataInicio.getTime())) {
            throw new Error(`Linha ${index + 2}: Data de início inválida`);
          }

          // Identificar cliente automaticamente pelo nome do lançamento
          const nomeNormalizado = item.nome_lancamento.toLowerCase().trim();
          const clienteEncontrado = clientes.find(cliente => {
            // Verificar pelo slug
            if (cliente.slug && nomeNormalizado.includes(cliente.slug.toLowerCase())) {
              return true;
            }
            
            // Verificar pelos aliases
            if (cliente.aliases && Array.isArray(cliente.aliases)) {
              return cliente.aliases.some(alias => 
                nomeNormalizado.includes(alias.toLowerCase())
              );
            }
            
            // Verificar pelo nome do cliente
            return nomeNormalizado.includes(cliente.nome.toLowerCase());
          });

          // Preparar dados para inserção
          const lancamentoData = {
            nome_lancamento: item.nome_lancamento.trim(),
            descricao: item.descricao?.trim() || null,
            cliente_id: clienteEncontrado?.id || null,
            gestor_responsavel_id: clienteEncontrado?.primary_gestor_user_id || null,
            tipo_lancamento: item.tipo_lancamento.toLowerCase(),
            status_lancamento: 'em_captacao',
            data_inicio_captacao: dataInicio.toISOString().split('T')[0],
            data_fim_captacao: item.data_fim_captacao ? 
              new Date(item.data_fim_captacao).toISOString().split('T')[0] : null,
            investimento_total: parseFloat(item.investimento_total) || 0,
            link_dashboard: item.link_dashboard?.trim() || null,
            link_briefing: item.link_briefing?.trim() || null,
            observacoes: item.observacoes?.trim() || null,
            created_by: userData.user.id
          };

          const { error } = await supabase
            .from('lancamentos')
            .insert([lancamentoData as any]);

          if (error) throw error;
          sucessos++;

        } catch (error: any) {
          erros.push(error.message);
        }
      }

      setResultado({ sucessos, erros });
      setEtapa('resultado');

      if (sucessos > 0) {
        toast({
          title: "Importação concluída",
          description: `${sucessos} lançamentos importados com sucesso.`,
        });
      }

    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setArquivo(null);
    setDadosPreview([]);
    setEtapa('upload');
    setResultado({ sucessos: 0, erros: [] });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (etapa === 'resultado' && resultado.sucessos > 0) {
      onImportacaoConcluida();
    }
    onOpenChange(false);
    resetModal();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Lançamentos</DialogTitle>
          <DialogDescription>
            Importe lançamentos a partir de um arquivo CSV
          </DialogDescription>
        </DialogHeader>

        {etapa === 'upload' && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O arquivo CSV deve conter as colunas: nome_lancamento, tipo_lancamento, 
                data_inicio_captacao, investimento_total. Campos opcionais: descricao, data_fim_captacao, 
                link_dashboard, link_briefing, observacoes.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="arquivo">Arquivo CSV</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {arquivo ? arquivo.name : 'Selecionar arquivo CSV'}
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p><strong>Formato esperado:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Arquivo CSV com vírgula como separador</li>
                <li>Primeira linha deve conter os cabeçalhos</li>
                <li>Datas no formato AAAA-MM-DD</li>
                <li>Valores numéricos usando ponto decimal</li>
              </ul>
            </div>
          </div>
        )}

        {etapa === 'preview' && (
          <div className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Foram encontrados {dadosPreview.length} lançamentos no arquivo. 
                Revise os dados antes de confirmar a importação.
              </AlertDescription>
            </Alert>

            <div className="max-h-96 overflow-y-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Nome</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-left">Data Início</th>
                    <th className="p-2 text-left">Investimento</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosPreview.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{item.nome_lancamento}</td>
                      <td className="p-2">{item.tipo_lancamento}</td>
                      <td className="p-2">{item.data_inicio_captacao}</td>
                      <td className="p-2">R$ {parseFloat(item.investimento_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetModal}>
                Voltar
              </Button>
              <Button onClick={validarEImportar} disabled={loading}>
                {loading ? 'Importando...' : 'Confirmar Importação'}
              </Button>
            </div>
          </div>
        )}

        {etapa === 'resultado' && (
          <div className="space-y-4">
            <Alert className={resultado.erros.length === 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
              {resultado.erros.length === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
              <AlertDescription>
                <strong>Importação concluída:</strong> {resultado.sucessos} lançamentos importados com sucesso.
                {resultado.erros.length > 0 && ` ${resultado.erros.length} erros encontrados.`}
              </AlertDescription>
            </Alert>

            {resultado.erros.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Erros encontrados:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {resultado.erros.map((erro, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {erro}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportarLancamentosModal;