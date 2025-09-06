import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, TrendingUp, FileSpreadsheet, CheckCircle, AlertCircle, Eye, Database } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const [showPreview, setShowPreview] = useState(false);

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

      console.log(`Conectando planilha ${type} com ID: ${sheetId}`);

      // Convert Google Sheets URL to CSV export URL
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
      
      console.log(`Fazendo fetch dos dados: ${csvUrl}`);
      
      // Fetch the CSV data
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status}. Verifique se a planilha é pública.`);
      }

      const csvText = await response.text();
      console.log(`Dados CSV recebidos (${csvText.length} caracteres)`);
      
      // Parse CSV to JSON
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        throw new Error('Planilha vazia');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length >= headers.length) {
          const row: any = {};
          headers.forEach((header, index) => {
            row[header.toLowerCase()] = values[index] || '';
          });
          data.push(row);
        }
      }

      console.log(`Processados ${data.length} registros para ${type}`);
      console.log('Headers encontrados:', headers);
      console.log('Primeiro registro:', data[0]);

      setSheetsData(prev => prev.map(s => 
        s.type === type ? { 
          ...s, 
          status: 'validated',
          data: data
        } : s
      ));

      toast.success(`Planilha ${sheet.name} conectada com sucesso! ${data.length} registros encontrados`);
    } catch (error) {
      console.error(`Erro ao conectar planilha ${type}:`, error);
      setSheetsData(prev => prev.map(s => 
        s.type === type ? { 
          ...s, 
          status: 'error', 
          errors: [error.message || 'Erro ao conectar com a planilha. Verifique se a URL está correta e se a planilha é pública.']
        } : s
      ));
      toast.error(`Erro ao conectar planilha ${sheet.name}: ${error.message}`);
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

  const getTotalRecords = () => {
    return sheetsData.reduce((total, sheet) => {
      if (sheet.status === 'validated' && sheet.data) {
        return total + sheet.data.length;
      }
      return total;
    }, 0);
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
          {sheetsData.filter(s => s.status === 'validated').length} planilha(s) conectada(s) • {getTotalRecords()} registros no total
        </p>
        <div className="flex space-x-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            Voltar
          </Button>
          {canProceed() && (
            <Button 
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Ocultar' : 'Visualizar'} Dados
            </Button>
          )}
          <Button 
            onClick={processDebriefing}
            disabled={!canProceed()}
          >
            <Database className="h-4 w-4 mr-2" />
            Processar Debriefing
          </Button>
        </div>
      </div>

      {showPreview && canProceed() && (
        <div className="mt-6 space-y-6">
          <div className="flex items-center space-x-2 pb-4 border-b">
            <Eye className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Prévia dos Dados Importados</h3>
          </div>
          
          {sheetsData.map((sheet) => {
            if (sheet.status !== 'validated' || !sheet.data || sheet.data.length === 0) return null;
            
            return (
              <Card key={sheet.type}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{sheet.name} ({sheet.data.length} registros)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border max-h-64 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(sheet.data[0] || {}).slice(0, 6).map((key) => (
                            <TableHead key={key} className="font-medium">
                              {key}
                            </TableHead>
                          ))}
                          {Object.keys(sheet.data[0] || {}).length > 6 && (
                            <TableHead>...</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheet.data.slice(0, 5).map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).slice(0, 6).map((value, cellIndex) => (
                              <TableCell key={cellIndex} className="text-sm">
                                {String(value).length > 30 
                                  ? String(value).substring(0, 30) + '...' 
                                  : String(value)
                                }
                              </TableCell>
                            ))}
                            {Object.values(row).length > 6 && (
                              <TableCell>...</TableCell>
                            )}
                          </TableRow>
                        ))}
                        {sheet.data.length > 5 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground text-sm">
                              ... e mais {sheet.data.length - 5} registros
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Validação dos Dados</h4>
                <p className="text-sm text-blue-700 mb-2">
                  Revise os dados importados acima antes de continuar. Certifique-se de que:
                </p>
                <ul className="text-sm text-blue-700 space-y-1 ml-4">
                  <li>• Os emails estão corretos para cruzamento entre leads e compradores</li>
                  <li>• As datas estão no formato adequado</li>
                  <li>• Os valores monetários estão corretos</li>
                  <li>• Não há dados faltando ou incorretos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}