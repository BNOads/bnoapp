import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export const ConfiguracaoSheets = () => {
  const [config, setConfig] = useState({
    spreadsheet_id: '',
    aba_resumo_ano_1: 'Resumo_ano_1',
    aba_resumo_ano_2: 'Resumo_ano_2',
    aba_clientes_ativos: 'Clientes_ativos',
    aba_movimentos: 'Movimentos',
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('financeiro_config')
        .upsert({
          id: 1,
          ...config,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Configuração salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-financeiro', {
        body: { 
          action: 'read',
          sheet: 'resumo-ano-1',
          refresh: true 
        },
      });

      if (error) throw error;

      setTestResult('success');
      toast.success('Conexão testada com sucesso!');
    } catch (error) {
      console.error('Erro ao testar:', error);
      setTestResult('error');
      toast.error('Erro ao conectar com Google Sheets');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração Google Sheets</CardTitle>
        <CardDescription>
          Configure a conexão com a planilha do Google Sheets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="spreadsheet_id">Spreadsheet ID</Label>
          <Input
            id="spreadsheet_id"
            placeholder="1AbC..."
            value={config.spreadsheet_id}
            onChange={(e) => setConfig({ ...config, spreadsheet_id: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            ID da planilha (encontrado na URL após /d/)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="aba_resumo_ano_1">Aba Resumo Ano 1</Label>
            <Input
              id="aba_resumo_ano_1"
              value={config.aba_resumo_ano_1}
              onChange={(e) => setConfig({ ...config, aba_resumo_ano_1: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aba_resumo_ano_2">Aba Resumo Ano 2</Label>
            <Input
              id="aba_resumo_ano_2"
              value={config.aba_resumo_ano_2}
              onChange={(e) => setConfig({ ...config, aba_resumo_ano_2: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aba_clientes_ativos">Aba Clientes Ativos</Label>
            <Input
              id="aba_clientes_ativos"
              value={config.aba_clientes_ativos}
              onChange={(e) => setConfig({ ...config, aba_clientes_ativos: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aba_movimentos">Aba Movimentos</Label>
            <Input
              id="aba_movimentos"
              value={config.aba_movimentos}
              onChange={(e) => setConfig({ ...config, aba_movimentos: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={loading || !config.spreadsheet_id}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar Configuração
          </Button>

          <Button 
            variant="outline" 
            onClick={handleTest} 
            disabled={testing || !config.spreadsheet_id}
          >
            {testing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {testResult === 'success' && <CheckCircle className="h-4 w-4 mr-2 text-green-600" />}
            {testResult === 'error' && <XCircle className="h-4 w-4 mr-2 text-red-600" />}
            Testar Conexão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
