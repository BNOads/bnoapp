import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CSVUploadSectionProps {
  debriefingData: any;
  onComplete: () => void;
}

interface ProcessedData {
  vendas_total: number;
  leads_total: number;
  investimento_total: number;
  faturamento_total: number;
  cpl: number;
  roas: number;
  ticket_medio: number;
  conversao_lead_venda: number;
  dados_trafego?: any[];
  dados_leads?: any[];
  dados_compradores?: any[];
}

export default function CSVUploadSection({ debriefingData, onComplete }: CSVUploadSectionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [rawData, setRawData] = useState<any[]>([]);

  const validateCSVHeaders = (headers: string[]): string[] => {
    const requiredHeaders = ['data', 'vendas', 'leads', 'investimento'];
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    const missingHeaders = requiredHeaders.filter(required => 
      !normalizedHeaders.some(header => header.includes(required))
    );
    return missingHeaders;
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('Arquivo CSV vazio');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const missingHeaders = validateCSVHeaders(headers);
    
    if (missingHeaders.length > 0) {
      throw new Error(`Colunas obrigatórias não encontradas: ${missingHeaders.join(', ')}`);
    }

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

    return data;
  };

  const processData = (data: any[]): ProcessedData => {
    let totalVendas = 0;
    let totalLeads = 0;
    let totalInvestimento = 0;
    let totalFaturamento = 0;

    const processedRows = data.map(row => {
      const vendas = parseFloat(row.vendas || '0') || 0;
      const leads = parseFloat(row.leads || '0') || 0;
      const investimento = parseFloat(row.investimento || '0') || 0;
      const faturamento = parseFloat(row.faturamento || '0') || 0;

      totalVendas += vendas;
      totalLeads += leads;
      totalInvestimento += investimento;
      totalFaturamento += faturamento;

      return {
        ...row,
        vendas,
        leads,
        investimento,
        faturamento
      };
    });

    const cpl = totalLeads > 0 ? totalInvestimento / totalLeads : 0;
    const roas = totalInvestimento > 0 ? totalFaturamento / totalInvestimento : 0;
    const ticketMedio = totalVendas > 0 ? totalFaturamento / totalVendas : 0;
    const conversaoLeadVenda = totalLeads > 0 ? totalVendas / totalLeads : 0;

    return {
      vendas_total: totalVendas,
      leads_total: totalLeads,
      investimento_total: totalInvestimento,
      faturamento_total: totalFaturamento,
      cpl,
      roas,
      ticket_medio: ticketMedio,
      conversao_lead_venda: conversaoLeadVenda,
      dados_trafego: processedRows
    };
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Por favor, selecione um arquivo CSV válido');
        return;
      }
      setFile(selectedFile);
      setProcessedData(null);
      setRawData([]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecione um arquivo CSV primeiro');
      return;
    }

    setUploading(true);
    try {
      const csvText = await file.text();
      const data = parseCSV(csvText);
      const processed = processData(data);
      
      setRawData(data);
      setProcessedData(processed);
      
      toast.success(`CSV processado com sucesso! ${data.length} registros encontrados`);
    } catch (error: any) {
      console.error('Erro ao processar CSV:', error);
      toast.error(`Erro ao processar CSV: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const saveDebriefing = async () => {
    if (!processedData) return;

    try {
      const debriefingId = sessionStorage.getItem('current_debriefing_id');
      if (!debriefingId) throw new Error('ID do debriefing não encontrado');

      const { error } = await supabase
        .from('debriefings')
        .update({
          leads_total: processedData.leads_total,
          vendas_total: processedData.vendas_total,
          investimento_total: processedData.investimento_total,
          faturamento_total: processedData.faturamento_total,
          cpl: processedData.cpl,
          roas: processedData.roas,
          ticket_medio: processedData.ticket_medio,
          conversao_lead_venda: processedData.conversao_lead_venda,
          dados_trafego: processedData.dados_trafego,
          status: 'concluido'
        })
        .eq('id', debriefingId);

      if (error) throw error;

      toast.success('Debriefing atualizado com sucesso!');
      onComplete();
    } catch (error: any) {
      console.error('Erro ao salvar debriefing:', error);
      toast.error('Erro ao salvar debriefing');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Importar Dados via CSV</span>
          </CardTitle>
          <CardDescription>
            Faça upload de um arquivo CSV com os dados do seu lançamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">Arquivo CSV</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">
              Selecione um arquivo CSV com as colunas: data, vendas, leads, investimento
            </p>
          </div>

          <Button 
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? 'Processando...' : 'Importar CSV'}
          </Button>

          <div className="text-xs text-muted-foreground bg-blue-50 p-4 rounded-lg">
            <p className="font-medium mb-2">Formato esperado do CSV:</p>
            <div className="grid grid-cols-2 gap-1 mb-2">
              <span className="font-mono bg-white px-2 py-1 rounded">data</span>
              <span className="font-mono bg-white px-2 py-1 rounded">vendas</span>
              <span className="font-mono bg-white px-2 py-1 rounded">leads</span>
              <span className="font-mono bg-white px-2 py-1 rounded">investimento</span>
            </div>
            <p className="text-orange-600 font-medium">
              Colunas adicionais como "faturamento", "campanha", etc. são opcionais e serão ignoradas se não utilizadas.
            </p>
          </div>
        </CardContent>
      </Card>

      {processedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Dados Processados</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Ocultar' : 'Visualizar'} Dados
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {processedData.vendas_total}
                  </div>
                  <p className="text-sm text-blue-600 font-medium">Total de Vendas</p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {processedData.leads_total}
                  </div>
                  <p className="text-sm text-green-600 font-medium">Total de Leads</p>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(processedData.investimento_total / processedData.vendas_total || 0)}
                  </div>
                  <p className="text-sm text-purple-600 font-medium">Custo por Venda</p>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    {processedData.roas.toFixed(2)}x
                  </div>
                  <p className="text-sm text-orange-600 font-medium">ROAS</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Investimento Total</p>
                <p className="text-lg font-semibold">{formatCurrency(processedData.investimento_total)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">CPL</p>
                <p className="text-lg font-semibold">{formatCurrency(processedData.cpl)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Taxa de Conversão</p>
                <p className="text-lg font-semibold">{(processedData.conversao_lead_venda * 100).toFixed(1)}%</p>
              </div>
            </div>

            <Button onClick={saveDebriefing} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Salvar Debriefing
            </Button>
          </CardContent>
        </Card>
      )}

      {showPreview && rawData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prévia dos Dados ({rawData.length} registros)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(rawData[0] || {}).slice(0, 6).map((key) => (
                      <TableHead key={key} className="font-medium">
                        {key}
                      </TableHead>
                    ))}
                    {Object.keys(rawData[0] || {}).length > 6 && (
                      <TableHead>...</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawData.slice(0, 5).map((row, index) => (
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
                  {rawData.length > 5 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground text-sm">
                        ... e mais {rawData.length - 5} registros
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}