import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, FileText, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CSVWizard from "./CSVWizard";
import { supabase } from "@/integrations/supabase/client";

interface Cliente {
  id: string;
  nome: string;
}

interface DebriefingData {
  cliente_id: string;
  cliente_nome: string;
  nome_lancamento: string;
  periodo_inicio: string;
  periodo_fim: string;
  moeda: string;
  meta_roas?: number;
  meta_cpl?: number;
}

export default function NovoDebriefing() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [debriefingData, setDebriefingData] = useState<DebriefingData>({
    cliente_id: '',
    cliente_nome: '',
    nome_lancamento: '',
    periodo_inicio: '',
    periodo_fim: '',
    moeda: 'BRL',
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const { data: clientes, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) {
        throw error;
      }

      setClientes(clientes || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

  const handleInputChange = (field: keyof DebriefingData, value: string | number) => {
    setDebriefingData(prev => ({ ...prev, [field]: value }));
  };

  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    setDebriefingData(prev => ({
      ...prev,
      cliente_id: clienteId,
      cliente_nome: cliente?.nome || ''
    }));
  };

  const canProceedToStep2 = () => {
    return debriefingData.cliente_id && 
           debriefingData.nome_lancamento && 
           debriefingData.periodo_inicio && 
           debriefingData.periodo_fim;
  };

  const createDebriefing = async () => {
    if (!canProceedToStep2()) return;

    setLoading(true);
    try {
      const { data: debriefing, error } = await supabase
        .from('debriefings')
        .insert({
          cliente_id: debriefingData.cliente_id,
          cliente_nome: debriefingData.cliente_nome,
          nome_lancamento: debriefingData.nome_lancamento,
          periodo_inicio: debriefingData.periodo_inicio,
          periodo_fim: debriefingData.periodo_fim,
          moeda: debriefingData.moeda,
          meta_roas: debriefingData.meta_roas,
          meta_cpl: debriefingData.meta_cpl,
          status: 'rascunho',
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Debriefing criado com sucesso!');
      setCurrentStep(2);
      
      // Store debriefing ID for Google Sheets processing
      sessionStorage.setItem('current_debriefing_id', debriefing.id);
    } catch (error) {
      console.error('Erro ao criar debriefing:', error);
      toast.error('Erro ao criar debriefing');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploadComplete = () => {
    const debriefingId = sessionStorage.getItem('current_debriefing_id');
    if (debriefingId) {
      sessionStorage.removeItem('current_debriefing_id');
      navigate(`/debriefings/${debriefingId}`);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/debriefings')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Debriefing</h1>
          <p className="text-muted-foreground">
            Crie um novo relatório de análise de lançamento
          </p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            1
          </div>
          <div className={`h-px flex-1 ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            2
          </div>
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className={currentStep >= 1 ? 'text-primary font-medium' : 'text-muted-foreground'}>
            Configuração
          </span>
          <span className={currentStep >= 2 ? 'text-primary font-medium' : 'text-muted-foreground'}>
            Upload de Dados
          </span>
        </div>
      </div>

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Debriefing</CardTitle>
            <CardDescription>
              Defina as informações básicas do lançamento que será analisado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente</Label>
                <Select value={debriefingData.cliente_id} onValueChange={handleClienteChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome_lancamento">Nome do Lançamento</Label>
                <Input
                  id="nome_lancamento"
                  value={debriefingData.nome_lancamento}
                  onChange={(e) => handleInputChange('nome_lancamento', e.target.value)}
                  placeholder="Ex: Lançamento Agosto 2025"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodo_inicio">Data de Início</Label>
                <Input
                  id="periodo_inicio"
                  type="date"
                  value={debriefingData.periodo_inicio}
                  onChange={(e) => handleInputChange('periodo_inicio', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodo_fim">Data de Fim</Label>
                <Input
                  id="periodo_fim"
                  type="date"
                  value={debriefingData.periodo_fim}
                  onChange={(e) => handleInputChange('periodo_fim', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="moeda">Moeda</Label>
                <Select value={debriefingData.moeda} onValueChange={(value) => handleInputChange('moeda', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">Real (R$)</SelectItem>
                    <SelectItem value="USD">Dólar ($)</SelectItem>
                    <SelectItem value="EUR">Euro (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_roas">Meta ROAS (opcional)</Label>
                <Input
                  id="meta_roas"
                  type="number"
                  step="0.1"
                  value={debriefingData.meta_roas || ''}
                  onChange={(e) => handleInputChange('meta_roas', parseFloat(e.target.value))}
                  placeholder="Ex: 3.5"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={() => navigate('/debriefings')}>
                Cancelar
              </Button>
              <Button 
                onClick={createDebriefing} 
                disabled={!canProceedToStep2() || loading}
              >
                {loading ? 'Criando...' : 'Continuar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Importação de Dados</CardTitle>
              <CardDescription>
                Importe 3 arquivos CSV (Vendas, Leads, Tráfego) para gerar o debriefing completo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CSVWizard 
                debriefingData={debriefingData}
                onComplete={handleFileUploadComplete}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}