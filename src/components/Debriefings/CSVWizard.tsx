import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, CheckCircle, AlertTriangle, Eye, Download, ArrowRight, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CampaignStageValidator from "./CampaignStageValidator";

interface CSVWizardProps {
  debriefingData: any;
  onComplete: () => void;
  isEditMode?: boolean;
}

interface CSVFile {
  type: 'vendas' | 'leads' | 'trafego' | 'pesquisa' | 'outras_fontes';
  file: File | null;
  data: any[];
  headers: string[];
  mapping: Record<string, string>;
  valid: boolean;
  errors: string[];
  optional?: boolean;
}

interface ConsolidatedData {
  vendas_total: number;
  leads_total: number;
  gasto_total: number;
  faturamento_total: number;
  cpl: number;
  cpv: number;
  conversao_lead_venda: number;
  ctr: number;
  cpc: number;
  ticket_medio: number;
  roas: number;
  periodo_inicio: string;
  periodo_fim: string;
  dados_consolidados: any[];
}

const requiredFields = {
  vendas: ['email', 'valor'],
  leads: ['data', 'email'],
  trafego: ['date', 'spend', 'impressions', 'campaign_name', 'link_criativo'],
  pesquisa: ['email'],
  outras_fontes: ['data', 'plataforma', 'gasto', 'link_criativo']
};

const optionalFields = {
  vendas: ['data', 'produto', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term'],
  leads: ['nome', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term'],
  trafego: ['action_link_clicks', 'action_leads', 'ad_name', 'adset_name', 'reach', 'action_landing_page_view', 'action_3s_video_views', 'video_25_percent_watched', 'video_50_percent_watched', 'video_75_percent_watched', 'video_100_percent_watched', 'instagram_permalink_url'],
  pesquisa: ['idade', 'genero', 'renda', 'poder_de_compra', 'eventos'],
  outras_fontes: ['campanha', 'impressoes', 'cliques', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term']
};

export default function CSVWizard({ debriefingData, onComplete, isEditMode = false }: CSVWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [csvFiles, setCsvFiles] = useState<CSVFile[]>([
    { type: 'vendas', file: null, data: [], headers: [], mapping: {}, valid: false, errors: [], optional: false },
    { type: 'leads', file: null, data: [], headers: [], mapping: {}, valid: false, errors: [], optional: false },
    { type: 'trafego', file: null, data: [], headers: [], mapping: {}, valid: false, errors: [], optional: false },
    { type: 'pesquisa', file: null, data: [], headers: [], mapping: {}, valid: false, errors: [], optional: true },
    { type: 'outras_fontes', file: null, data: [], headers: [], mapping: {}, valid: false, errors: [], optional: true }
  ]);
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedData | null>(null);
  const [dataConfirmed, setDataConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showStageValidator, setShowStageValidator] = useState(false);
  const [stageMappings, setStageMappings] = useState<any[]>([]);

  const getFieldMappings = (type: string) => {
    const commonMappings = [
      { key: 'nome', label: 'Nome', aliases: ['nome', 'name', 'first name', 'cliente'] },
      { key: 'email', label: 'Email', aliases: ['email', 'e-mail', 'mail', 'endereço de email'] }
    ];

    switch (type) {
      case 'leads':
        return [
          ...commonMappings,
          { key: 'telefone', label: 'Telefone', aliases: ['telefone', 'phone', 'celular', 'whatsapp'] },
          { key: 'data', label: 'Data', aliases: ['data', 'date', 'created', 'timestamp', 'carimbo'] },
          { key: 'utm_source', label: 'UTM Source', aliases: ['utm_source', 'source', 'fonte'] },
          { key: 'utm_campaign', label: 'UTM Campaign', aliases: ['utm_campaign', 'campaign', 'campanha'] }
        ];
      
      case 'pesquisa':
        return [
          { key: 'carimbo', label: 'Carimbo de data/hora', aliases: ['carimbo de data/hora', 'timestamp', 'data', 'date'] },
          { key: 'nome', label: 'Nome', aliases: ['nome', 'name'] },
          { key: 'email', label: 'E-mail', aliases: ['e-mail', 'email'] },
          { key: 'telefone', label: 'Telefone', aliases: ['telefone', 'phone'] },
          { key: 'sexo', label: 'Sexo', aliases: ['sexo', 'gênero', 'genero', 'gender'] },
          { key: 'idade', label: 'Idade', aliases: ['idade', 'age'] },
          { key: 'formacao', label: 'Formação', aliases: ['qual é a sua formação?', 'formação', 'formacao', 'education'] },
          { key: 'tempo_formado', label: 'Tempo formado', aliases: ['há quanto tempo você se formou?', 'tempo formado', 'graduation time'] },
          { key: 'situacao_trabalho', label: 'Situação de trabalho', aliases: ['qual é a sua situação de trabalho atual?', 'situação trabalho', 'work situation'] },
          { key: 'renda_mensal', label: 'Renda mensal', aliases: ['atualmente, qual é a sua renda mensal?', 'renda mensal', 'income'] },
          { key: 'utm_source', label: 'UTM Source', aliases: ['utm source', 'utm_source'] },
          { key: 'utm_medium', label: 'UTM Medium', aliases: ['utm medium', 'utm_medium'] },
          { key: 'utm_campaign', label: 'UTM Campaign', aliases: ['utm campaign', 'utm_campaign'] },
          { key: 'utm_term', label: 'UTM Term', aliases: ['utm term', 'utm_term'] },
          { key: 'utm_content', label: 'UTM Content', aliases: ['utm content', 'utm_content'] }
        ];

      case 'vendas':
        return [
          ...commonMappings,
          { key: 'valor', label: 'Valor da Compra', aliases: ['valor', 'value', 'price', 'preço'] },
          { key: 'data', label: 'Data da Compra', aliases: ['data', 'date', 'purchase date', 'data compra'] },
          { key: 'produto', label: 'Produto', aliases: ['produto', 'product', 'item'] }
        ];

      case 'trafego':
        return [
          { key: 'campaign_name', label: 'Nome da Campanha', aliases: ['Campaign Name', 'campanha', 'nome campanha'] },
          { key: 'spend', label: 'Gasto/Investimento', aliases: ['Spend (Cost, Amount Spent)', 'gasto', 'investimento', 'cost'] },
          { key: 'impressions', label: 'Impressões', aliases: ['Impressions', 'impressoes', 'impressões'] },
          { key: 'action_link_clicks', label: 'Cliques', aliases: ['Action Link Clicks', 'cliques', 'clicks'] },
          { key: 'action_leads', label: 'Leads', aliases: ['Action Leads', 'leads', 'conversions'] },
          { key: 'ad_name', label: 'Nome do Criativo', aliases: ['Ad Name', 'nome criativo', 'creative'] },
          { key: 'link_criativo', label: 'Link do Criativo', aliases: ['link criativo', 'creative link', 'image url'] },
          { key: 'date', label: 'Data', aliases: ['date', 'data', 'day'] }
        ];

      case 'outras_fontes':
        return [
          { key: 'plataforma', label: 'Plataforma', aliases: ['plataforma', 'platform', 'source'] },
          { key: 'campanha', label: 'Campanha', aliases: ['campanha', 'campaign'] },
          { key: 'gasto', label: 'Gasto', aliases: ['gasto', 'spend', 'cost', 'investimento'] },
          { key: 'impressoes', label: 'Impressões', aliases: ['impressoes', 'impressions'] },
          { key: 'cliques', label: 'Cliques', aliases: ['cliques', 'clicks'] },
          { key: 'leads', label: 'Leads', aliases: ['leads', 'conversions'] },
          { key: 'data', label: 'Data', aliases: ['data', 'date', 'day'] }
        ];

      default:
        return commonMappings;
    }
  };

  const getAutoMapping = (type: string, headers: string[]) => {
    const fieldMappings = getFieldMappings(type);
    const autoMapping: Record<string, string> = {};
    
    // Para cada campo esperado, tentar encontrar correspondência nos headers
    fieldMappings.forEach(field => {
      const matchingHeader = headers.find(header => {
        const normalizedHeader = header.toLowerCase().trim();
        // Verificar correspondência exata primeiro
        if (normalizedHeader === field.key.toLowerCase()) {
          return true;
        }
        // Verificar aliases
        return field.aliases.some(alias => 
          normalizedHeader === alias.toLowerCase() ||
          normalizedHeader.includes(alias.toLowerCase())
        );
      });
      
      if (matchingHeader) {
        autoMapping[field.key] = matchingHeader.toLowerCase();
      }
    });
    
    return autoMapping;
  };

  const parseCSV = (csvText: string): { headers: string[], data: any[] } => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('Arquivo CSV vazio');
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

    return { headers, data };
  };

  const handleFileUpload = async (type: 'vendas' | 'leads' | 'trafego' | 'pesquisa' | 'outras_fontes', file: File) => {
    try {
      const csvText = await file.text();
      const { headers, data } = parseCSV(csvText);
      
      // Fazer mapeamento automático baseado nos aliases
      const autoMapping = getAutoMapping(type, headers);
      
      setCsvFiles(prev => prev.map(csv => 
        csv.type === type 
          ? { ...csv, file, data, headers, mapping: autoMapping, valid: false, errors: [] }
          : csv
      ));

      const mappedFields = Object.keys(autoMapping).length;
      const totalFields = getFieldMappings(type).length;
      
      toast.success(`CSV de ${type} carregado! ${data.length} registros encontrados. ${mappedFields}/${totalFields} campos mapeados automaticamente.`);
    } catch (error: any) {
      toast.error(`Erro ao carregar CSV de ${type}: ${error.message}`);
    }
  };

  const validateMapping = (csv: CSVFile): { valid: boolean, errors: string[] } => {
    const errors: string[] = [];
    const required = requiredFields[csv.type];
    
    // Verificar campos obrigatórios
    for (const field of required) {
      if (!csv.mapping[field]) {
        errors.push(`Campo obrigatório '${field}' não mapeado`);
      }
    }

    // Validar dados das primeiras linhas
    if (csv.data.length > 0) {
      const sampleSize = Math.min(10, csv.data.length);
      for (let i = 0; i < sampleSize; i++) {
        const row = csv.data[i];
        
        // Validar data
        const dateField = csv.type === 'trafego' ? csv.mapping.date : csv.mapping.data;
        if (dateField && csv.type !== 'vendas') { // Para vendas, data é opcional
          const dateValue = row[dateField];
          if (dateValue && !isValidDate(dateValue)) {
            errors.push(`Linha ${i + 2}: Data inválida '${dateValue}'`);
          }
        }

        // Validar valores numéricos
        if (csv.type === 'vendas' && csv.mapping.valor) {
          const valor = parseFloat(row[csv.mapping.valor]);
          if (isNaN(valor) || valor <= 0) {
            errors.push(`Linha ${i + 2}: Valor inválido '${row[csv.mapping.valor]}'`);
          }
        }

        if (csv.type === 'trafego') {
          if (csv.mapping.spend) {
            const gasto = parseFloat(row[csv.mapping.spend]);
            if (isNaN(gasto) || gasto < 0) {
              errors.push(`Linha ${i + 2}: Gasto inválido '${row[csv.mapping.spend]}'`);
            }
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const isValidDate = (dateStr: string): boolean => {
    // Suporta YYYY-MM-DD e DD/MM/YYYY
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{2}\/\d{2}\/\d{4}$/
    ];
    
    return formats.some(format => format.test(dateStr)) && !isNaN(Date.parse(normalizeDate(dateStr)));
  };

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === '') return '';
    
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  const consolidateData = (): ConsolidatedData => {
    const vendas = csvFiles.find(csv => csv.type === 'vendas')!;
    const leads = csvFiles.find(csv => csv.type === 'leads')!;
    const trafego = csvFiles.find(csv => csv.type === 'trafego')!;
    const pesquisa = csvFiles.find(csv => csv.type === 'pesquisa' && csv.file);
    const outrasFontes = csvFiles.find(csv => csv.type === 'outras_fontes' && csv.file);

    // Mapear dados de cada CSV
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const vendasData = vendas.data.map(row => {
      const dataVenda = vendas.mapping.data ? normalizeDate(row[vendas.mapping.data]) : '';
      return {
        data: dataVenda || hoje,
        email: row[vendas.mapping.email],
        valor: parseFloat(row[vendas.mapping.valor] || '0'),
        utm_source: row[vendas.mapping.utm_source] || '(sem atribuição)',
        utm_medium: row[vendas.mapping.utm_medium] || '(sem atribuição)',
        utm_campaign: row[vendas.mapping.utm_campaign] || '(sem atribuição)',
        utm_term: row[vendas.mapping.utm_term] || ''
      };
    });

    const leadsData = leads.data.map(row => {
      const dataLead = normalizeDate(row[leads.mapping.data]);
      return {
        data: dataLead || hoje,
        email: row[leads.mapping.email],
        utm_source: row[leads.mapping.utm_source] || '(sem atribuição)',
        utm_medium: row[leads.mapping.utm_medium] || '(sem atribuição)',
        utm_campaign: row[leads.mapping.utm_campaign] || '(sem atribuição)',
        utm_term: row[leads.mapping.utm_term] || ''
      };
    });

    const trafegoData = trafego.data.map(row => {
      const dataTrafego = normalizeDate(row[trafego.mapping.date]);
      return {
        data: dataTrafego || hoje,
        campanha: row[trafego.mapping.campaign_name] || 'N/A',
        gasto: parseFloat(row[trafego.mapping.spend] || '0'),
        impressoes: parseInt(row[trafego.mapping.impressions] || '0'),
        cliques: parseInt(row[trafego.mapping.action_link_clicks] || '0'),
        leads_trafego: parseInt(row[trafego.mapping.action_leads] || '0'),
        ad_name: row[trafego.mapping.ad_name] || '',
        adset_name: row[trafego.mapping.adset_name] || '',
        link_criativo: row[trafego.mapping.link_criativo] || '',
        utm_source: 'facebook',
        utm_medium: 'paid',
        utm_campaign: row[trafego.mapping.campaign_name] || '(sem atribuição)',
        utm_term: ''
      };
    });

    // Processar dados de pesquisa (opcional)
    const pesquisaData = pesquisa ? pesquisa.data.map(row => ({
      carimbo: row[pesquisa.mapping.carimbo] || '',
      nome: row[pesquisa.mapping.nome] || '',
      email: row[pesquisa.mapping.email] || '',
      telefone: row[pesquisa.mapping.telefone] || '',
      sexo: row[pesquisa.mapping.sexo] || '',
      idade: parseInt(row[pesquisa.mapping.idade] || '0'),
      formacao: row[pesquisa.mapping.formacao] || '',
      tempo_formado: row[pesquisa.mapping.tempo_formado] || '',
      situacao_trabalho: row[pesquisa.mapping.situacao_trabalho] || '',
      renda_mensal: row[pesquisa.mapping.renda_mensal] || '',
      utm_source: row[pesquisa.mapping.utm_source] || '',
      utm_medium: row[pesquisa.mapping.utm_medium] || '',
      utm_campaign: row[pesquisa.mapping.utm_campaign] || '',
      utm_term: row[pesquisa.mapping.utm_term] || '',
      utm_content: row[pesquisa.mapping.utm_content] || ''
    })) : [];

    // Processar outras fontes de tráfego (opcional)
    const outrasData = outrasFontes ? outrasFontes.data.map(row => {
      const dataOutra = normalizeDate(row[outrasFontes.mapping.data]);
      return {
        data: dataOutra || hoje,
        plataforma: row[outrasFontes.mapping.plataforma] || 'Outras',
        campanha: row[outrasFontes.mapping.campanha] || 'N/A',
        gasto: parseFloat(row[outrasFontes.mapping.gasto] || '0'),
        impressoes: parseInt(row[outrasFontes.mapping.impressoes] || '0'),
        cliques: parseInt(row[outrasFontes.mapping.cliques] || '0'),
        link_criativo: row[outrasFontes.mapping.link_criativo] || '',
        utm_source: row[outrasFontes.mapping.utm_source] || row[outrasFontes.mapping.plataforma]?.toLowerCase(),
        utm_medium: row[outrasFontes.mapping.utm_medium] || 'paid',
        utm_campaign: row[outrasFontes.mapping.utm_campaign] || row[outrasFontes.mapping.campanha],
        utm_term: row[outrasFontes.mapping.utm_term] || ''
      };
    }) : [];

    // Consolidar por data + UTM
    const consolidated: Record<string, any> = {};

    // Processar vendas
    vendasData.forEach(venda => {
      const key = `${venda.data}_${venda.utm_source}_${venda.utm_medium}_${venda.utm_campaign}`;
      if (!consolidated[key]) {
        consolidated[key] = {
          data: venda.data,
          utm_source: venda.utm_source,
          utm_medium: venda.utm_medium,
          utm_campaign: venda.utm_campaign,
          vendas: 0,
          faturamento: 0,
          leads: 0,
          gasto: 0,
          impressoes: 0,
          cliques: 0
        };
      }
      consolidated[key].vendas += 1;
      consolidated[key].faturamento += venda.valor;
    });

    // Processar leads
    leadsData.forEach(lead => {
      const key = `${lead.data}_${lead.utm_source}_${lead.utm_medium}_${lead.utm_campaign}`;
      if (!consolidated[key]) {
        consolidated[key] = {
          data: lead.data,
          utm_source: lead.utm_source,
          utm_medium: lead.utm_medium,
          utm_campaign: lead.utm_campaign,
          vendas: 0,
          faturamento: 0,
          leads: 0,
          gasto: 0,
          impressoes: 0,
          cliques: 0
        };
      }
      consolidated[key].leads += 1;
    });

    // Processar tráfego
    trafegoData.forEach(traf => {
      const key = `${traf.data}_${traf.utm_source}_${traf.utm_medium}_${traf.utm_campaign}`;
      if (!consolidated[key]) {
        consolidated[key] = {
          data: traf.data,
          utm_source: traf.utm_source,
          utm_medium: traf.utm_medium,
          utm_campaign: traf.utm_campaign,
          vendas: 0,
          faturamento: 0,
          leads: 0,
          gasto: 0,
          impressoes: 0,
          cliques: 0
        };
      }
      consolidated[key].gasto += traf.gasto;
      consolidated[key].impressoes += traf.impressoes;
      consolidated[key].cliques += traf.cliques;
    });

    const dados_consolidados = Object.values(consolidated);

    // Calcular totais
    const vendas_total = dados_consolidados.reduce((sum, item) => sum + item.vendas, 0);
    const leads_total = dados_consolidados.reduce((sum, item) => sum + item.leads, 0);
    const gasto_total = dados_consolidados.reduce((sum, item) => sum + item.gasto, 0);
    const faturamento_total = dados_consolidados.reduce((sum, item) => sum + item.faturamento, 0);
    const impressoes_total = dados_consolidados.reduce((sum, item) => sum + item.impressoes, 0);
    const cliques_total = dados_consolidados.reduce((sum, item) => sum + item.cliques, 0);

    // Calcular métricas
    const cpl = leads_total > 0 ? gasto_total / leads_total : 0;
    const cpv = vendas_total > 0 ? gasto_total / vendas_total : 0;
    const conversao_lead_venda = leads_total > 0 ? vendas_total / leads_total : 0;
    const ctr = impressoes_total > 0 ? cliques_total / impressoes_total : 0;
    const cpc = cliques_total > 0 ? gasto_total / cliques_total : 0;
    const ticket_medio = vendas_total > 0 ? faturamento_total / vendas_total : 0;
    const roas = gasto_total > 0 ? faturamento_total / gasto_total : 0;

    // Detectar período
    const dates = dados_consolidados.map(item => item.data).filter(date => date && date !== '').sort();
    const periodo_inicio = dates.length > 0 ? dates[0] : hoje;
    const periodo_fim = dates.length > 0 ? dates[dates.length - 1] : hoje;

    return {
      vendas_total,
      leads_total,
      gasto_total,
      faturamento_total,
      cpl,
      cpv,
      conversao_lead_venda,
      ctr,
      cpc,
      ticket_medio,
      roas,
      periodo_inicio,
      periodo_fim,
      dados_consolidados
    };
  };

  const handleProceedToMapping = () => {
    const requiredFiles = csvFiles.filter(csv => !csv.optional);
    const hasRequiredFiles = requiredFiles.every(csv => csv.file !== null);
    if (!hasRequiredFiles) {
      toast.error('Selecione os 3 arquivos CSV obrigatórios (Vendas, Leads e Tráfego) antes de continuar');
      return;
    }
    setCurrentStep(2);
  };

  const handleProceedToConfirmation = () => {
    // Validar mapeamentos apenas dos arquivos carregados
    const updatedCsvFiles = csvFiles.map(csv => {
      if (csv.file !== null) {
        const validation = validateMapping(csv);
        return { ...csv, valid: validation.valid, errors: validation.errors };
      }
      return { ...csv, valid: true, errors: [] }; // Arquivos opcionais não carregados são válidos
    });

    setCsvFiles(updatedCsvFiles);

    // Verificar se todos os arquivos carregados são válidos
    const loadedFiles = updatedCsvFiles.filter(csv => csv.file !== null);
    const allValid = loadedFiles.every(csv => csv.valid);
    if (!allValid) {
      toast.error('Corrija os erros de mapeamento antes de continuar');
      return;
    }

    // Consolidar dados
    const consolidated = consolidateData();
    setConsolidatedData(consolidated);
    
    // Mostrar validador de etapas se há dados de tráfego
    const trafegoFile = csvFiles.find(csv => csv.type === 'trafego' && csv.file);
    if (trafegoFile && trafegoFile.data.length > 0) {
      setShowStageValidator(true);
    } else {
      setCurrentStep(3);
    }
  };

  const handleStageValidationConfirm = (mappings: any[]) => {
    setStageMappings(mappings);
    setShowStageValidator(false);
    setCurrentStep(3);
  };

  const handleImport = async () => {
    if (!dataConfirmed || !consolidatedData) {
      toast.error('Confirme que os dados estão corretos antes de importar');
      return;
    }

    setProcessing(true);
    try {
      const debriefingId = sessionStorage.getItem('current_debriefing_id');
      if (!debriefingId) throw new Error('ID do debriefing não encontrado');

      // Preparar dados para salvamento
      const vendasCsv = csvFiles.find(csv => csv.type === 'vendas');
      const leadsCsv = csvFiles.find(csv => csv.type === 'leads');
      const pesquisaCsv = csvFiles.find(csv => csv.type === 'pesquisa' && csv.file);
      const outrasfontesCsv = csvFiles.find(csv => csv.type === 'outras_fontes' && csv.file);

      const { error } = await supabase
        .from('debriefings')
        .update({
          leads_total: consolidatedData.leads_total,
          vendas_total: consolidatedData.vendas_total,
          investimento_total: consolidatedData.gasto_total,
          faturamento_total: consolidatedData.faturamento_total,
          cpl: consolidatedData.cpl,
          roas: consolidatedData.roas,
          ticket_medio: consolidatedData.ticket_medio,
          conversao_lead_venda: consolidatedData.conversao_lead_venda,
          periodo_inicio: consolidatedData.periodo_inicio || null,
          periodo_fim: consolidatedData.periodo_fim || null,
          dados_leads: leadsCsv?.data || [],
          dados_compradores: vendasCsv?.data || [],
          dados_trafego: consolidatedData.dados_consolidados,
          dados_pesquisa: pesquisaCsv?.data || [],
          dados_outras_fontes: outrasfontesCsv?.data || [],
          distribuicao_etapas: stageMappings.length > 0 ? stageMappings : null,
          status: 'concluido'
        })
        .eq('id', debriefingId);

      if (error) throw error;

      toast.success('Dados importados com sucesso!');
      onComplete();
    } catch (error: any) {
      console.error('Erro ao importar dados:', error);
      toast.error('Erro ao importar dados');
    } finally {
      setProcessing(false);
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
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            1
          </div>
          <div className={`h-px flex-1 ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            2
          </div>
          <div className={`h-px flex-1 ${currentStep >= 3 ? 'bg-primary' : 'bg-muted'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            3
          </div>
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className={currentStep >= 1 ? 'text-primary font-medium' : 'text-muted-foreground'}>
            Arquivos
          </span>
          <span className={currentStep >= 2 ? 'text-primary font-medium' : 'text-muted-foreground'}>
            Mapeamento
          </span>
          <span className={currentStep >= 3 ? 'text-primary font-medium' : 'text-muted-foreground'}>
            Confirmação
          </span>
        </div>
      </div>

      {/* Warning message */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 mb-1">⚠️ Confira os dados nos CSVs antes de importar</h4>
            <p className="text-sm text-amber-700">
              Verifique datas, valores e UTMs. Dados incorretos podem gerar métricas imprecisas.
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: File Selection */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Etapa 1: Seleção dos Arquivos</h2>
          
          {csvFiles.map((csv, index) => (
            <Card key={csv.type}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    CSV de {csv.type.charAt(0).toUpperCase() + csv.type.slice(1).replace('_', ' ')}
                    {csv.optional && <Badge variant="secondary" className="ml-2">Opcional</Badge>}
                  </span>
                  {csv.file && <CheckCircle className="h-5 w-5 text-green-500" />}
                </CardTitle>
                <CardDescription>
                  {csv.type === 'vendas' && 'Dados de vendas realizadas com email do cliente'}
                  {csv.type === 'leads' && 'Dados de leads capturados com email'}
                  {csv.type === 'trafego' && 'Dados do Facebook/Meta Ads (export do Ads Manager)'}
                  {csv.type === 'pesquisa' && 'Dados demográficos dos leads (opcional)'}
                  {csv.type === 'outras_fontes' && 'Dados de outras plataformas de tráfego como TikTok, LinkedIn Ads (opcional)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(csv.type, file);
                  }}
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Campos esperados:</p>
                  <div className="flex flex-wrap gap-1">
                    {requiredFields[csv.type].map(field => (
                      <Badge key={field} variant="outline" className="text-xs bg-red-50">
                        {field}*
                      </Badge>
                    ))}
                    {optionalFields[csv.type].map(field => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">* Campos obrigatórios</p>
                </div>
                {csv.file && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ {csv.data.length} registros carregados
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button 
              onClick={handleProceedToMapping}
              disabled={!csvFiles.filter(csv => !csv.optional).every(csv => csv.file)}
            >
              Próximo: Mapeamento <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Etapa 2: Mapeamento de Colunas</h2>
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          </div>

          <Tabs defaultValue="vendas">
            <TabsList className="grid w-full grid-cols-5">
              {csvFiles.map(csv => (
                <TabsTrigger key={csv.type} value={csv.type} disabled={!csv.file}>
                  {csv.type.charAt(0).toUpperCase() + csv.type.slice(1).replace('_', ' ')}
                  {csv.valid && <CheckCircle className="ml-2 h-4 w-4 text-green-500" />}
                </TabsTrigger>
              ))}
            </TabsList>

            {csvFiles.map(csv => (
              <TabsContent key={csv.type} value={csv.type}>
                <Card>
                  <CardHeader>
                    <CardTitle>Mapeamento - {csv.type.charAt(0).toUpperCase() + csv.type.slice(1)}</CardTitle>
                    <CardDescription>
                      Associe as colunas do seu CSV aos campos do sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Mapping interface */}
                    <div className="grid grid-cols-2 gap-4">
                      {[...requiredFields[csv.type], ...optionalFields[csv.type]].map(field => (
                        <div key={field} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>
                              {field}
                              {requiredFields[csv.type].includes(field) && 
                                <span className="text-red-500 ml-1">*</span>
                              }
                            </Label>
                            {csv.mapping[field] && csv.mapping[field] !== '' && (
                              <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">Auto-mapeado</Badge>
                            )}
                          </div>
                          <Select
                            value={csv.mapping[field] || '__none__'}
                            onValueChange={(value) => {
                              setCsvFiles(prev => prev.map(c => 
                                c.type === csv.type 
                                  ? { ...c, mapping: { ...c.mapping, [field]: value === "__none__" ? "" : value } }
                                  : c
                              ));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a coluna" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Não mapear</SelectItem>
                              {csv.headers.map(header => (
                                <SelectItem key={header} value={header.toLowerCase()}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>

                    {/* Preview data */}
                    {csv.data.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Prévia dos dados (primeiras 5 linhas)</h4>
                        <div className="border rounded-lg overflow-auto max-h-64">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {csv.headers.slice(0, 6).map(header => (
                                  <TableHead key={header}>{header}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {csv.data.slice(0, 5).map((row, index) => (
                                <TableRow key={index}>
                                  {csv.headers.slice(0, 6).map(header => (
                                    <TableCell key={header}>
                                      {String(row[header.toLowerCase()]).slice(0, 20)}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Validation errors */}
                    {csv.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-800 mb-2">Erros de validação:</h4>
                        <ul className="text-sm text-red-600 space-y-1">
                          {csv.errors.map((error, i) => (
                            <li key={i}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex justify-end">
            <Button onClick={handleProceedToConfirmation}>
              Próximo: Confirmação <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {currentStep === 3 && consolidatedData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Etapa 3: Confirmação dos Dados</h2>
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{consolidatedData.vendas_total}</div>
                <p className="text-sm text-blue-600 font-medium">Vendas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{consolidatedData.leads_total}</div>
                <p className="text-sm text-green-600 font-medium">Leads</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{formatCurrency(consolidatedData.gasto_total)}</div>
                <p className="text-sm text-red-600 font-medium">Gasto</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(consolidatedData.cpl)}</div>
                <p className="text-sm text-purple-600 font-medium">CPL</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(consolidatedData.cpv)}</div>
                <p className="text-sm text-orange-600 font-medium">CPV</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-teal-600">{consolidatedData.roas.toFixed(2)}x</div>
                <p className="text-sm text-teal-600 font-medium">ROAS</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-indigo-600">{formatCurrency(consolidatedData.ticket_medio)}</div>
                <p className="text-sm text-indigo-600 font-medium">Ticket Médio</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-pink-600">{(consolidatedData.conversao_lead_venda * 100).toFixed(1)}%</div>
                <p className="text-sm text-pink-600 font-medium">Conversão</p>
              </CardContent>
            </Card>
          </div>

          {/* Period and summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo da Importação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Período detectado:</strong></p>
                  <p>{consolidatedData.periodo_inicio} a {consolidatedData.periodo_fim}</p>
                </div>
                <div>
                  <p><strong>Registros consolidados:</strong></p>
                  <p>{consolidatedData.dados_consolidados.length} entradas únicas por data+UTM</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation checkbox */}
          <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
            <Checkbox 
              id="confirm-data"
              checked={dataConfirmed}
              onCheckedChange={(checked) => setDataConfirmed(checked === true)}
            />
            <Label htmlFor="confirm-data" className="text-sm font-medium">
              Conferi os dados e estão corretos. Prosseguir com a importação.
            </Label>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleImport}
              disabled={!dataConfirmed || processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? 'Importando...' : 'Importar Dados'}
              <Upload className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Validador de Etapas das Campanhas */}
      <CampaignStageValidator
        isOpen={showStageValidator}
        onClose={() => {
          setShowStageValidator(false);
          setCurrentStep(3);
        }}
        onConfirm={handleStageValidationConfirm}
        trafegoData={csvFiles.find(csv => csv.type === 'trafego')?.data || []}
        clienteId={debriefingData.cliente_id}
      />
    </div>
  );
}