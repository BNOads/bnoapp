import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, TrendingUp, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GoogleSheetsSectionProps {
  debriefingData: any;
  onComplete: () => void;
}

interface SheetData {
  name: string;
  type: 'leads' | 'compradores' | 'trafego';
  status: 'none' | 'connecting' | 'connected' | 'validated' | 'error';
  url: string;
  data?: any[];
  errors?: string[];
}

export default function GoogleSheetsSection({ debriefingData, onComplete }: GoogleSheetsSectionProps) {
  const [sheetsData, setSheetsData] = useState<SheetData[]>([
    { name: 'Leads', type: 'leads', status: 'none', url: '' },
    { name: 'Compradores', type: 'compradores', status: 'none', url: '' },
    { name: 'Tráfego', type: 'trafego', status: 'none', url: '' }
  ]);
  const [activeTab, setActiveTab] = useState("leads");

  const handleUrlChange = (type: 'leads' | 'compradores' | 'trafego', url: string) => {
    setSheetsData(prev => prev.map(sheet => 
      sheet.type === type ? { ...sheet, url } : sheet
    ));
  };

  const connectSheet = async (type: 'leads' | 'compradores' | 'trafego') => {
    const sheet = sheetsData.find(s => s.type === type);
    if (!sheet || !sheet.url) return;

    setSheetsData(prev => prev.map(s => 
      s.type === type ? { ...s, status: 'connecting' } : s
    ));

    try {
      // Extract sheet ID from URL
      const sheetId = extractSheetId(sheet.url);
      if (!sheetId) {
        throw new Error('URL inválida do Google Sheets');
      }

      // Here we would validate and process the Google Sheets data
      // For now, simulating the process
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSheetsData(prev => prev.map(s => 
        s.type === type ? { 
          ...s, 
          status: 'validated',
          data: getMockData(type) // In real implementation, this would be the actual data
        } : s
      ));

      toast.success(`Planilha ${sheet.name} conectada com sucesso!`);
    } catch (error) {
      setSheetsData(prev => prev.map(s => 
        s.type === type ? { 
          ...s, 
          status: 'error', 
          errors: ['Erro ao conectar com a planilha. Verifique se a URL está correta e se a planilha é pública.']
        } : s
      ));
      toast.error(`Erro ao conectar planilha ${sheet.name}`);
    }
  };

  const extractSheetId = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const getMockData = (type: string) => {
    // Mock data for demonstration
    switch (type) {
      case 'leads':
        return [
          { email: 'user1@email.com', nome: 'User 1', data_captura: '2025-08-01' },
          { email: 'user2@email.com', nome: 'User 2', data_captura: '2025-08-02' }
        ];
      case 'compradores':
        return [
          { email: 'user1@email.com', valor: 399.90, data_compra: '2025-08-03' }
        ];
      case 'trafego':
        return [
          { data: '2025-08-01', investimento: 250.00, plataforma: 'Meta', campanha: 'Campanha A' }
        ];
      default:
        return [];
    }
  };

  const canProceed = () => {
    return sheetsData.some(s => s.status === 'validated');
  };

  const processDebriefing = async () => {
    try {
      const debriefingId = sessionStorage.getItem('current_debriefing_id');
      if (!debriefingId) throw new Error('ID do debriefing não encontrado');

      // Collect all validated sheet data
      const validatedSheets = sheetsData.filter(s => s.status === 'validated');
      const processData: any = {};

      validatedSheets.forEach(sheet => {
        if (sheet.type === 'leads') processData.dados_leads = sheet.data;
        if (sheet.type === 'compradores') processData.dados_compradores = sheet.data;
        if (sheet.type === 'trafego') processData.dados_trafego = sheet.data;
      });

      // Call the edge function to process the debriefing
      const { data, error } = await supabase.functions.invoke('processar-debriefing', {
        body: {
          debriefing_id: debriefingId,
          ...processData
        }
      });

      if (error) throw error;

      toast.success('Debriefing processado com sucesso!');
      onComplete();
    } catch (error) {
      console.error('Erro ao processar debriefing:', error);
      toast.error('Erro ao processar debriefing');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting': return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const sheetTypes = [
    {
      id: 'leads',
      title: 'Leads',
      description: 'Dados de captação de leads',
      icon: Users,
      fields: ['email', 'nome', 'telefone', 'data_captura', 'utm_source', 'utm_medium', 'utm_campaign'],
      note: 'O campo email é obrigatório para cruzamento com compradores'
    },
    {
      id: 'compradores',
      title: 'Compradores',
      description: 'Dados de vendas e faturamento',
      icon: TrendingUp,
      fields: ['email', 'data_compra', 'valor', 'meio_pagamento', 'produto'],
      note: 'Cruzamento feito pelo email (sem necessidade de pedido_id ou lead_id)'
    },
    {
      id: 'trafego',
      title: 'Tráfego',
      description: 'Dados de investimento em anúncios',
      icon: FileSpreadsheet,
      fields: ['data', 'investimento', 'impressoes', 'campanha', 'cliques', 'leads', 'anuncios', 'conjunto_anuncios', 'frequencia', 'page_view', 'plataforma'],
      note: 'Todos os campos são obrigatórios para análise completa'
    }
  ];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          {sheetTypes.map((type) => {
            const sheet = sheetsData.find(s => s.type === type.id);
            return (
              <TabsTrigger key={type.id} value={type.id} className="flex items-center space-x-2">
                <type.icon className="h-4 w-4" />
                <span>{type.title}</span>
                {getStatusIcon(sheet?.status || 'none')}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sheetTypes.map((type) => {
          const sheet = sheetsData.find(s => s.type === type.id);
          return (
            <TabsContent key={type.id} value={type.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <type.icon className="h-5 w-5" />
                    <span>Google Sheets - {type.title}</span>
                  </CardTitle>
                  <CardDescription>{type.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`url-${type.id}`}>URL da Planilha do Google Sheets</Label>
                    <Input
                      id={`url-${type.id}`}
                      value={sheet?.url || ''}
                      onChange={(e) => handleUrlChange(type.id as any, e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      A planilha deve estar configurada como "Qualquer pessoa com o link pode visualizar"
                    </p>
                  </div>

                  <Button 
                    onClick={() => connectSheet(type.id as any)}
                    disabled={!sheet?.url || sheet?.status === 'connecting'}
                    className="w-full"
                  >
                    {sheet?.status === 'connecting' ? 'Conectando...' : 'Conectar Planilha'}
                  </Button>

                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-2">Campos esperados na planilha:</p>
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      {type.fields.map((field) => (
                        <span key={field} className="font-mono bg-muted px-2 py-1 rounded">
                          {field}
                        </span>
                      ))}
                    </div>
                    <p className="text-orange-600 font-medium">{type.note}</p>
                  </div>

                  {sheet?.errors && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-800 mb-2">Erros encontrados:</h4>
                      <ul className="text-sm text-red-600 space-y-1">
                        {sheet.errors.map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sheet?.status === 'validated' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-green-800">
                          Planilha conectada com sucesso
                        </span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        {sheet.data?.length || 0} registros encontrados
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="flex justify-between items-center pt-6 border-t">
        <p className="text-sm text-muted-foreground">
          {sheetsData.filter(s => s.status === 'validated').length} planilha(s) conectada(s) com sucesso
        </p>
        <div className="flex space-x-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            Voltar
          </Button>
          <Button 
            onClick={processDebriefing}
            disabled={!canProceed()}
          >
            Processar Debriefing
          </Button>
        </div>
      </div>
    </div>
  );
}