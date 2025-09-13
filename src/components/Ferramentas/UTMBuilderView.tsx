import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/Auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Copy,
  Trash2,
  Save,
  Settings,
  Plus,
  X,
  Link as LinkIcon,
  History,
  Bookmark,
  AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UTMParams {
  websiteUrl: string;
  campaignId: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  customParams: { key: string; value: string }[];
}

interface UTMPreset {
  id: string;
  name: string;
  params: UTMParams;
  isGlobal?: boolean;
  created_by: string;
  created_at: string;
}

interface UTMHistory {
  id: string;
  url: string;
  params: UTMParams;
  created_at: string;
}

const SOURCE_PRESETS = [
  { value: "meta", label: "Meta (Facebook/Instagram)" },
  { value: "google", label: "Google" },
  { value: "manychat", label: "ManyChat" },
  { value: "newsletter", label: "Newsletter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" }
];

const MEDIUM_PRESETS = [
  { value: "cpc", label: "CPC (Cost Per Click)" },
  { value: "email", label: "Email" },
  { value: "social", label: "Social" },
  { value: "referral", label: "Referral" },
  { value: "banner", label: "Banner" },
  { value: "organic", label: "Organic" },
  { value: "affiliate", label: "Affiliate" },
  { value: "display", label: "Display" }
];

export function UTMBuilderView() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [params, setParams] = useState<UTMParams>({
    websiteUrl: "",
    campaignId: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmTerm: "",
    utmContent: "",
    customParams: []
  });

  const [generatedUrl, setGeneratedUrl] = useState("");
  const [presets, setPresets] = useState<UTMPreset[]>([]);
  const [history, setHistory] = useState<UTMHistory[]>([]);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isGlobalPreset, setIsGlobalPreset] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPresets();
    loadHistory();
  }, []);

  useEffect(() => {
    generateURL();
  }, [params]);

  const loadPresets = async () => {
    try {
      // Usar localStorage temporariamente até os tipos serem atualizados
      const storedPresets = localStorage.getItem('utm_presets');
      if (storedPresets) {
        setPresets(JSON.parse(storedPresets));
      }
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  };

  const loadHistory = async () => {
    try {
      // Usar localStorage temporariamente até os tipos serem atualizados
      const storedHistory = localStorage.getItem('utm_history');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const generateURL = () => {
    if (!params.websiteUrl || !params.utmSource || !params.utmMedium) {
      setGeneratedUrl("");
      return;
    }

    if (!validateUrl(params.websiteUrl)) {
      setGeneratedUrl("");
      return;
    }

    try {
      const url = new URL(params.websiteUrl);
      const searchParams = new URLSearchParams();

      // Parâmetros UTM obrigatórios
      if (params.utmSource) searchParams.set('utm_source', normalizeText(params.utmSource));
      if (params.utmMedium) searchParams.set('utm_medium', normalizeText(params.utmMedium));
      if (params.utmCampaign) searchParams.set('utm_campaign', normalizeText(params.utmCampaign));
      
      // Parâmetros UTM opcionais
      if (params.utmTerm) searchParams.set('utm_term', normalizeText(params.utmTerm));
      if (params.utmContent) searchParams.set('utm_content', normalizeText(params.utmContent));
      
      // Campaign ID
      if (params.campaignId) searchParams.set('campaign_id', params.campaignId);

      // Parâmetros customizados
      params.customParams.forEach(param => {
        if (param.key && param.value) {
          searchParams.set(param.key, param.value);
        }
      });

      // Preservar parâmetros existentes
      url.search = searchParams.toString();
      setGeneratedUrl(url.toString());
    } catch (error) {
      setGeneratedUrl("");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "✅ Copiado!",
        description: "URL copiada para a área de transferência",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao copiar URL",
        variant: "destructive"
      });
    }
  };

  const clearForm = () => {
    setParams({
      websiteUrl: "",
      campaignId: "",
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      utmTerm: "",
      utmContent: "",
      customParams: []
    });
    setGeneratedUrl("");
  };

  const saveToHistory = async () => {
    if (!generatedUrl || !user) return;

    try {
      // Usar localStorage temporariamente até os tipos serem atualizados
      const storedHistory = localStorage.getItem('utm_history');
      const currentHistory = storedHistory ? JSON.parse(storedHistory) : [];
      
      const newEntry: UTMHistory = {
        id: crypto.randomUUID(),
        url: generatedUrl,
        params: params,
        created_at: new Date().toISOString()
      };
      
      const updatedHistory = [newEntry, ...currentHistory].slice(0, 10);
      localStorage.setItem('utm_history', JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  };

  const savePreset = async () => {
    if (!presetName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o preset",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Usar localStorage temporariamente até os tipos serem atualizados
      const storedPresets = localStorage.getItem('utm_presets');
      const currentPresets = storedPresets ? JSON.parse(storedPresets) : [];
      
      const newPreset: UTMPreset = {
        id: crypto.randomUUID(),
        name: presetName,
        params: params,
        isGlobal: isGlobalPreset,
        created_by: user?.id || '',
        created_at: new Date().toISOString()
      };
      
      const updatedPresets = [newPreset, ...currentPresets];
      localStorage.setItem('utm_presets', JSON.stringify(updatedPresets));
      setPresets(updatedPresets);

      toast({
        title: "✅ Preset salvo",
        description: `Preset "${presetName}" criado com sucesso`,
      });

      setShowPresetDialog(false);
      setPresetName("");
      setIsGlobalPreset(false);
    } catch (error) {
      console.error('Error saving preset:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar preset",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (preset: UTMPreset) => {
    setParams(preset.params);
    toast({
      title: "✅ Preset carregado",
      description: `Preset "${preset.name}" aplicado`,
    });
  };

  const addCustomParam = () => {
    setParams(prev => ({
      ...prev,
      customParams: [...prev.customParams, { key: "", value: "" }]
    }));
  };

  const updateCustomParam = (index: number, field: 'key' | 'value', value: string) => {
    setParams(prev => ({
      ...prev,
      customParams: prev.customParams.map((param, i) => 
        i === index ? { ...param, [field]: value } : param
      )
    }));
  };

  const removeCustomParam = (index: number) => {
    setParams(prev => ({
      ...prev,
      customParams: prev.customParams.filter((_, i) => i !== index)
    }));
  };

  const getSuggestion = () => {
    if (params.utmMedium === 'cpc' && params.utmSource === 'google' && !params.utmTerm) {
      return "💡 Dica: Para CPC do Google, considere preencher o campo UTM Term com palavras-chave.";
    }
    return null;
  };

  const handleGenerateAndSave = async () => {
    if (generatedUrl) {
      await saveToHistory();
    }
  };

  useEffect(() => {
    if (generatedUrl) {
      handleGenerateAndSave();
    }
  }, [generatedUrl]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LinkIcon className="h-6 w-6" />
            Criador de UTM
          </h1>
          <p className="text-muted-foreground">
            Gere URLs com parâmetros UTM padronizados para tracking de campanhas
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Parâmetros UTM
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Website URL */}
            <div>
              <Label htmlFor="website-url">Website URL *</Label>
              <Input
                id="website-url"
                value={params.websiteUrl}
                onChange={(e) => setParams(prev => ({ ...prev, websiteUrl: e.target.value }))}
                placeholder="https://exemplo.com/pagina"
                className={!validateUrl(params.websiteUrl) && params.websiteUrl ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL de destino (deve começar com http:// ou https://)
              </p>
            </div>

            {/* Campaign ID */}
            <div>
              <Label htmlFor="campaign-id">Campaign ID</Label>
              <Input
                id="campaign-id"
                value={params.campaignId}
                onChange={(e) => setParams(prev => ({ ...prev, campaignId: e.target.value }))}
                placeholder="CAMP_001"
              />
              <p className="text-xs text-muted-foreground mt-1">
                ID interno da campanha (opcional)
              </p>
            </div>

            {/* UTM Source */}
            <div>
              <Label htmlFor="utm-source">UTM Source *</Label>
              <div className="space-y-2">
                <Input
                  id="utm-source"
                  value={params.utmSource}
                  onChange={(e) => setParams(prev => ({ ...prev, utmSource: e.target.value }))}
                  placeholder="meta, google, newsletter..."
                />
                <div className="flex flex-wrap gap-1">
                  {SOURCE_PRESETS.map(preset => (
                    <Badge
                      key={preset.value}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => setParams(prev => ({ ...prev, utmSource: preset.value }))}
                    >
                      {preset.value}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Origem do tráfego (ex.: google, meta, newsletter)
              </p>
            </div>

            {/* UTM Medium */}
            <div>
              <Label htmlFor="utm-medium">UTM Medium *</Label>
              <div className="space-y-2">
                <Input
                  id="utm-medium"
                  value={params.utmMedium}
                  onChange={(e) => setParams(prev => ({ ...prev, utmMedium: e.target.value }))}
                  placeholder="cpc, email, social..."
                />
                <div className="flex flex-wrap gap-1">
                  {MEDIUM_PRESETS.map(preset => (
                    <Badge
                      key={preset.value}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => setParams(prev => ({ ...prev, utmMedium: preset.value }))}
                    >
                      {preset.value}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Meio de marketing (ex.: cpc, banner, email)
              </p>
            </div>

            {/* UTM Campaign */}
            <div>
              <Label htmlFor="utm-campaign">UTM Campaign *</Label>
              <Input
                id="utm-campaign"
                value={params.utmCampaign}
                onChange={(e) => setParams(prev => ({ ...prev, utmCampaign: e.target.value }))}
                placeholder="black_friday_2024"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nome da campanha (ex.: black_friday_2024)
              </p>
            </div>

            {/* UTM Term */}
            <div>
              <Label htmlFor="utm-term">UTM Term</Label>
              <Input
                id="utm-term"
                value={params.utmTerm}
                onChange={(e) => setParams(prev => ({ ...prev, utmTerm: e.target.value }))}
                placeholder="palavra-chave"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Palavra-chave ou termo de busca
              </p>
            </div>

            {/* UTM Content */}
            <div>
              <Label htmlFor="utm-content">UTM Content</Label>
              <Input
                id="utm-content"
                value={params.utmContent}
                onChange={(e) => setParams(prev => ({ ...prev, utmContent: e.target.value }))}
                placeholder="banner_topo, email_promocional"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variação do criativo ou posicionamento
              </p>
            </div>

            {/* Parâmetros Customizados */}
            <div>
              <div className="flex items-center justify-between">
                <Label>Parâmetros Extras</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomParam}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              {params.customParams.map((param, index) => (
                <div key={index} className="flex gap-2 mt-2">
                  <Input
                    placeholder="chave"
                    value={param.key}
                    onChange={(e) => updateCustomParam(index, 'key', e.target.value)}
                  />
                  <Input
                    placeholder="valor"
                    value={param.value}
                    onChange={(e) => updateCustomParam(index, 'value', e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeCustomParam(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <p className="text-xs text-muted-foreground mt-1">
                Parâmetros personalizados (ex.: aff_id, gclid)
              </p>
            </div>

            {/* Sugestão */}
            {getSuggestion() && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">{getSuggestion()}</p>
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-2 pt-4">
              <Button onClick={clearForm} variant="outline">
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar
              </Button>
              
              <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Preset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Salvar Preset</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="preset-name">Nome do Preset</Label>
                      <Input
                        id="preset-name"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="Ex: Meta CPC Padrão"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowPresetDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={savePreset} disabled={loading}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* URL Gerada e Sidebar */}
        <div className="space-y-6">
          {/* URL Gerada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                URL Gerada
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedUrl ? (
                <div className="space-y-3">
                  <Textarea
                    value={generatedUrl}
                    readOnly
                    className="min-h-20 font-mono text-sm"
                  />
                  <Button
                    onClick={() => copyToClipboard(generatedUrl)}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar URL
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Preencha os campos obrigatórios para gerar a URL</p>
                  <p className="text-sm mt-1">Website URL, UTM Source e UTM Medium são obrigatórios</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Presets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5" />
                Presets Salvos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {presets.length > 0 ? (
                  <div className="space-y-2">
                    {presets.map(preset => (
                      <div
                        key={preset.id}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer"
                        onClick={() => loadPreset(preset)}
                      >
                        <div>
                          <p className="font-medium">{preset.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {preset.params.utmSource} • {preset.params.utmMedium}
                          </p>
                        </div>
                        {preset.isGlobal && (
                          <Badge variant="secondary">Global</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum preset salvo
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {history.length > 0 ? (
                  <div className="space-y-2">
                    {history.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm truncate">{item.url}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(item.url)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhuma URL no histórico
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}