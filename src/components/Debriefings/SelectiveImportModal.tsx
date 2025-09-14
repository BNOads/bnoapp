import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SelectiveImportProps {
  debriefingId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const CSV_TYPES = [
  { value: 'vendas', label: 'Vendas', description: 'Dados de vendas realizadas com email do cliente' },
  { value: 'leads', label: 'Leads', description: 'Dados de leads capturados com email' },
  { value: 'trafego', label: 'Tráfego', description: 'Dados do Facebook/Meta Ads (export do Ads Manager)' },
  { value: 'pesquisa', label: 'Pesquisa', description: 'Dados demográficos dos leads (opcional)' },
  { value: 'outras_fontes', label: 'Outras Fontes', description: 'Dados de outras plataformas de tráfego' }
];

export default function SelectiveImportModal({ debriefingId, isOpen, onClose, onComplete }: SelectiveImportProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [customSourceName, setCustomSourceName] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleFileUpload = (file: File) => {
    setFile(file);
  };

  const parseCSV = (csvText: string): { headers: string[], data: any[] } => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('Arquivo CSV vazio');
    }

    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(value => value.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        if (header && header.trim() !== '') {
          row[header.toLowerCase()] = values[index] || '';
        }
      });
      return row;
    });

    return { headers, data };
  };

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === '') return '';
    
    // Extrair apenas a parte da data se for um timestamp completo
    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
      const dateOnly = dateStr.split(' ')[0];
      const [day, month, year] = dateOnly.split('/');
      return `${year}-${month}-${day}`;
    }
    
    // Normalizar data simples DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month}-${day}`;
    }
    
    return dateStr;
  };

  const processData = (data: any[], type: string) => {
    const hoje = new Date().toISOString().split('T')[0];

    switch (type) {
      case 'vendas':
        return data.map(row => ({
          data: normalizeDate(row.data || row.date) || hoje,
          email: row.email || row['e-mail'] || '',
          valor: parseFloat(row.valor || row.value || '0'),
          produto: row.produto || row.product || '',
          utm_source: row.utm_source || row['utm source'] || '',
          utm_medium: row.utm_medium || row['utm medium'] || '',
          utm_campaign: row.utm_campaign || row['utm campaign'] || '',
          utm_term: row.utm_term || row['utm term'] || ''
        }));

      case 'leads':
        return data.map(row => ({
          data: normalizeDate(row.data || row.date) || hoje,
          nome: row.nome || row.name || '',
          email: row.email || row['e-mail'] || '',
          telefone: row.telefone || row.phone || '',
          utm_source: row.utm_source || row['utm source'] || '',
          utm_medium: row.utm_medium || row['utm medium'] || '',
          utm_campaign: row.utm_campaign || row['utm campaign'] || '',
          utm_term: row.utm_term || row['utm term'] || ''
        }));

      case 'trafego':
        return data.map(row => ({
          data: normalizeDate(row.date || row.data) || hoje,
          spend: parseFloat(row.spend || row['spend (cost, amount spent)'] || '0'),
          impressions: parseInt(row.impressions || '0'),
          campaign_name: row.campaign_name || row['campaign name'] || '',
          ad_name: row.ad_name || row['ad name'] || '',
          action_leads: parseInt(row.action_leads || row['action leads'] || '0'),
          action_link_clicks: parseInt(row.action_link_clicks || row['action link clicks'] || '0'),
          link_criativo: row.link_criativo || ''
        }));

      case 'pesquisa':
        return data.map(row => ({
          data: normalizeDate(row.data || row['Data']) || hoje,
          nome: row.nome || '',
          email: row.email || row['e-mail'] || '',
          telefone: row.telefone || '',
          sexo: row.sexo || '',
          idade: parseInt(row.idade || '0'),
          formacao: row.formacao || row['qual é a sua formação?'] || '',
          tempo_formado: row.tempo_formado || row['há quanto tempo você se formou?'] || '',
          situacao_trabalho: row.situacao_trabalho || row['qual é a sua situação de trabalho atual?'] || '',
          renda_mensal: row.renda_mensal || row['atualmente, qual é a sua renda mensal?'] || '',
          utm_source: row.utm_source || row['utm source'] || '',
          utm_medium: row.utm_medium || row['utm medium'] || '',
          utm_campaign: row.utm_campaign || row['utm campaign'] || '',
          utm_term: row.utm_term || row['utm term'] || '',
          utm_content: row.utm_content || row['utm content'] || ''
        }));

      case 'outras_fontes':
        const nomeFonte = customSourceName || 'Outras';
        return data.map(row => ({
          data: normalizeDate(row.data || row.date) || hoje,
          plataforma: nomeFonte,
          fonte_personalizada: customSourceName || '',
          campanha: row.campanha || row.campaign || 'N/A',
          gasto: parseFloat(row.gasto || row.spend || '0'),
          impressoes: parseInt(row.impressoes || row.impressions || '0'),
          cliques: parseInt(row.cliques || row.clicks || '0'),
          utm_source: row.utm_source || nomeFonte.toLowerCase(),
          utm_medium: row.utm_medium || 'paid',
          utm_campaign: row.utm_campaign || row.campanha || row.campaign,
          utm_term: row.utm_term || ''
        }));

      default:
        return data;
    }
  };

  const handleImport = async () => {
    if (!file || !selectedType) {
      toast.error('Selecione um tipo de dado e um arquivo');
      return;
    }

    if (selectedType === 'outras_fontes' && !customSourceName.trim()) {
      toast.error('Informe o nome da fonte de tráfego para "Outras Fontes"');
      return;
    }

    setProcessing(true);
    
    try {
      const text = await file.text();
      const { data } = parseCSV(text);
      
      if (data.length === 0) {
        throw new Error('Nenhum dado encontrado no arquivo');
      }

      const processedData = processData(data, selectedType);
      
      // Mapear o tipo para o campo correto na tabela
      const fieldMapping: Record<string, string> = {
        'vendas': 'dados_compradores',
        'leads': 'dados_leads',
        'trafego': 'dados_trafego',
        'pesquisa': 'dados_pesquisa',
        'outras_fontes': 'dados_outras_fontes'
      };

      const updateField = fieldMapping[selectedType];
      
      const { error } = await supabase
        .from('debriefings')
        .update({
          [updateField]: processedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', debriefingId);

      if (error) throw error;

      toast.success(`Dados de ${CSV_TYPES.find(t => t.value === selectedType)?.label} atualizados com sucesso!`);
      onComplete();
      onClose();
      
    } catch (error: any) {
      console.error('Erro ao importar dados:', error);
      toast.error(`Erro ao importar dados: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedType('');
    setFile(null);
    setCustomSourceName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Reimportar Dados Específicos
          </DialogTitle>
          <DialogDescription>
            Selecione o tipo de dados que deseja reimportar. Os dados existentes deste tipo serão substituídos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção do tipo de dados */}
          <div className="space-y-2">
            <Label htmlFor="data-type">Tipo de Dados</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de dados para reimportar" />
              </SelectTrigger>
              <SelectContent>
                {CSV_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nome personalizado para outras fontes */}
          {selectedType === 'outras_fontes' && (
            <div className="space-y-2">
              <Label htmlFor="source-name">Nome da Fonte de Tráfego *</Label>
              <Input
                id="source-name"
                placeholder="Ex: TikTok Ads, LinkedIn Ads, Taboola..."
                value={customSourceName}
                onChange={(e) => setCustomSourceName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Este nome será usado para identificar a fonte nos gráficos
              </p>
            </div>
          )}

          {/* Upload do arquivo */}
          {selectedType && (
            <div className="space-y-2">
              <Label htmlFor="file-upload">Arquivo CSV</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  {file.name} selecionado
                </div>
              )}
            </div>
          )}

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 mb-1">⚠️ Atenção</h4>
                <p className="text-sm text-amber-700">
                  Esta ação substituirá completamente os dados existentes do tipo selecionado. 
                  Certifique-se de que o arquivo está correto antes de prosseguir.
                </p>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={processing}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!file || !selectedType || processing || (selectedType === 'outras_fontes' && !customSourceName.trim())}
            >
              {processing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Reimportar Dados
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}