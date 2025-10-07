import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Link, Zap, Plus, X, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface UTMResult {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  url: string;
}

interface ExtraField {
  key: string;
  value: string;
  id: string;
}

interface SourceMediumOptions {
  [key: string]: string[];
}

const sourceMediumMap: SourceMediumOptions = {
  FACEBOOK: ["cpc", "stories", "feed", "reels", "banner", "carousel", "video"],
  INSTAGRAM: ["cpc", "stories", "feed", "reels", "influencer", "shopping", "explore"],
  YOUTUBE: ["cpc", "video", "shorts", "channel", "playlist", "premium"],
  BLOG: ["post", "article", "guest_post", "review", "tutorial"],
  EMAIL: ["newsletter", "automation", "campaign", "transactional", "welcome"],
  PINTEREST: ["pin", "board", "story", "shopping", "video"],
  APLICATIVO: ["push", "notification", "banner", "interstitial", "native"],
  TELEGRAM: ["channel", "group", "bot", "broadcast", "inline"],
  WHATSAPP: ["broadcast", "status", "group", "business", "catalog"],
  MANYCHAT: ["sequence", "broadcast", "flow", "keyword", "growth_tool"]
};

export const UTMBuilderView = () => {
  const { toast } = useToast();
  
  // Single UTM state
  const [singleUTM, setSingleUTM] = useState({
    url: "",
    source: "",
    medium: "",
    campaign: "",
    term: "",
    content: ""
  });

  // Bulk UTM state
  const [bulkUTM, setBulkUTM] = useState({
    url: "",
    campaign: "",
    term: "",
    content: ""
  });
  
  const [selectedSources, setSelectedSources] = useState<{[key: string]: string[]}>({});
  const [selectAllSources, setSelectAllSources] = useState(false);
  const [utmResults, setUtmResults] = useState<UTMResult[]>([]);
  const [extraFields, setExtraFields] = useState<ExtraField[]>([]);
  const [singleExtraFields, setSingleExtraFields] = useState<ExtraField[]>([]);

  // Check if URL is Hotmart
  const isHotmartUrl = (url: string) => {
    return url.toLowerCase().includes('hotmart');
  };

  // Normalize text for URL params
  const normalizeParam = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-z0-9_]/g, '') // Keep only alphanumeric and underscore
      .replace(/_+/g, '_') // Remove multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  };

  // Generate SCK parameter for Hotmart
  const generateSckParam = (source: string, medium: string, campaign: string, term: string, content: string) => {
    const parts = [
      normalizeParam(source),
      normalizeParam(medium),
      normalizeParam(campaign),
      normalizeParam(term),
      normalizeParam(content)
    ].filter(part => part.length > 0); // Remove empty parts but maintain order

    return parts.join('|');
  };

  // Validate extra field key
  const validateExtraKey = (key: string) => {
    return /^[a-z0-9_]+$/.test(key);
  };

  // Add extra field
  const addExtraField = (isSingle = false) => {
    const newField: ExtraField = {
      id: Date.now().toString(),
      key: '',
      value: ''
    };
    
    if (isSingle) {
      setSingleExtraFields(prev => [...prev, newField]);
    } else {
      setExtraFields(prev => [...prev, newField]);
    }
  };

  // Remove extra field
  const removeExtraField = (id: string, isSingle = false) => {
    if (isSingle) {
      setSingleExtraFields(prev => prev.filter(field => field.id !== id));
    } else {
      setExtraFields(prev => prev.filter(field => field.id !== id));
    }
  };

  // Update extra field
  const updateExtraField = (id: string, updates: Partial<ExtraField>, isSingle = false) => {
    const updateFunction = (prev: ExtraField[]) => 
      prev.map(field => field.id === id ? { ...field, ...updates } : field);
    
    if (isSingle) {
      setSingleExtraFields(updateFunction);
    } else {
      setExtraFields(updateFunction);
    }
  };

  // Generate single UTM
  const generateSingleUTM = (showValidation = false) => {
    if (!singleUTM.url || !singleUTM.source || !singleUTM.medium || !singleUTM.campaign) {
      if (showValidation) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha URL, Source, Medium e Campaign",
          variant: "destructive"
        });
      }
      return "";
    }

    const baseUrl = singleUTM.url.includes("?") ? singleUTM.url : singleUTM.url + "?";
    const params = new URLSearchParams();
    
    // Add UTM parameters
    params.set("utm_source", normalizeParam(singleUTM.source));
    params.set("utm_medium", normalizeParam(singleUTM.medium));
    params.set("utm_campaign", normalizeParam(singleUTM.campaign));
    
    if (singleUTM.term) params.set("utm_term", normalizeParam(singleUTM.term));
    if (singleUTM.content) params.set("utm_content", normalizeParam(singleUTM.content));

    // Add extra fields
    singleExtraFields.forEach(field => {
      if (field.key && field.value && validateExtraKey(field.key)) {
        params.set(field.key, encodeURIComponent(field.value));
      }
    });

    // Add SCK for Hotmart
    if (isHotmartUrl(singleUTM.url)) {
      const sck = generateSckParam(
        singleUTM.source,
        singleUTM.medium,
        singleUTM.campaign,
        singleUTM.term || '',
        singleUTM.content || ''
      );
      if (sck) params.set("sck", sck);
    }

    return baseUrl + params.toString();
  };

  // Handle select all sources
  const handleSelectAllSources = (checked: boolean) => {
    setSelectAllSources(checked);
    if (checked) {
      const allSources: {[key: string]: string[]} = {};
      Object.keys(sourceMediumMap).forEach(source => {
        allSources[source] = [...sourceMediumMap[source]];
      });
      setSelectedSources(allSources);
    } else {
      setSelectedSources({});
    }
  };

  // Handle select all mediums for a source
  const handleSelectAllMediums = (source: string, checked: boolean) => {
    setSelectedSources(prev => {
      const newSources = { ...prev };
      if (checked) {
        newSources[source] = [...sourceMediumMap[source]];
      } else {
        newSources[source] = [];
      }
      return newSources;
    });
  };

  // Update select all sources state when individual sources change
  useEffect(() => {
    const allSourcesSelected = Object.keys(sourceMediumMap).every(source => 
      source in selectedSources && selectedSources[source].length > 0
    );
    setSelectAllSources(allSourcesSelected && Object.keys(selectedSources).length === Object.keys(sourceMediumMap).length);
  }, [selectedSources]);

  // Generate bulk UTMs
  const generateBulkUTMs = () => {
    if (!bulkUTM.url) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha a URL",
        variant: "destructive"
      });
      return;
    }

    const results: UTMResult[] = [];
    
    Object.entries(selectedSources).forEach(([source, mediums]) => {
      mediums.forEach(medium => {
        const baseUrl = bulkUTM.url.includes("?") ? bulkUTM.url : bulkUTM.url + "?";
        const params = new URLSearchParams();
        
        // Add UTM parameters
        params.set("utm_source", normalizeParam(source));
        params.set("utm_medium", normalizeParam(medium));
        
        if (bulkUTM.campaign) {
          params.set("utm_campaign", normalizeParam(bulkUTM.campaign));
        }
        
        if (bulkUTM.term) {
          params.set("utm_term", normalizeParam(bulkUTM.term));
        }
        
        if (bulkUTM.content) {
          params.set("utm_content", normalizeParam(bulkUTM.content));
        }

        // Add extra fields
        extraFields.forEach(field => {
          if (field.key && field.value && validateExtraKey(field.key)) {
            params.set(field.key, encodeURIComponent(field.value));
          }
        });

        // Add SCK for Hotmart
        if (isHotmartUrl(bulkUTM.url)) {
          const sck = generateSckParam(
            source,
            medium,
            bulkUTM.campaign || '',
            bulkUTM.term || '',
            bulkUTM.content || ''
          );
          if (sck) params.set("sck", sck);
        }

        results.push({
          source,
          medium,
          campaign: bulkUTM.campaign || '',
          term: bulkUTM.term || '',
          content: bulkUTM.content || '',
          url: baseUrl + params.toString()
        });
      });
    });

    setUtmResults(results);
    
    if (results.length > 0) {
      toast({
        title: "UTMs geradas",
        description: `${results.length} URLs criadas com sucesso`
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "URL copiada para a área de transferência"
    });
  };

  const copyAllUrls = () => {
    const allUrls = utmResults.map(r => r.url).join("\n");
    navigator.clipboard.writeText(allUrls);
    toast({
      title: "Todas as URLs copiadas!",
      description: `${utmResults.length} URLs copiadas para a área de transferência`
    });
  };

  const exportToCsv = () => {
    const csvContent = [
      "Source,Medium,Campaign,Term,Content,URL Final",
      ...utmResults.map(r => `${r.source},${r.medium},${r.campaign},${r.term},${r.content},"${r.url}"`)
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utm-builder-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      utmResults.map(r => ({
        Source: r.source,
        Medium: r.medium,
        Campaign: r.campaign,
        Term: r.term,
        Content: r.content,
        'URL Final': r.url
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "UTMs");
    XLSX.writeFile(workbook, `utm-builder-${Date.now()}.xlsx`);
  };

  const handleSourceToggle = (source: string, checked: boolean) => {
    setSelectedSources(prev => {
      const newSources = { ...prev };
      if (checked) {
        newSources[source] = sourceMediumMap[source] || [];
      } else {
        delete newSources[source];
      }
      return newSources;
    });
  };

  const handleMediumToggle = (source: string, medium: string, checked: boolean) => {
    setSelectedSources(prev => {
      const newSources = { ...prev };
      if (!newSources[source]) newSources[source] = [];
      
      if (checked) {
        if (!newSources[source].includes(medium)) {
          newSources[source] = [...newSources[source], medium];
        }
      } else {
        newSources[source] = newSources[source].filter(m => m !== medium);
        if (newSources[source].length === 0) {
          delete newSources[source];
        }
      }
      return newSources;
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Criar UTM
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Criar em Massa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Gerador de UTM Individual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="url">Website URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://exemplo.com"
                    value={singleUTM.url}
                    onChange={(e) => setSingleUTM(prev => ({ ...prev, url: e.target.value }))}
                  />
                  {isHotmartUrl(singleUTM.url) && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        ⚠️ Link da Hotmart detectado → os parâmetros utm serão mantidos e será adicionado o campo sck.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="source">UTM Source *</Label>
                    <Input
                      id="source"
                      placeholder="ex: facebook, google"
                      value={singleUTM.source}
                      onChange={(e) => setSingleUTM(prev => ({ ...prev, source: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="medium">UTM Medium *</Label>
                    <Input
                      id="medium"
                      placeholder="ex: cpc, email, social"
                      value={singleUTM.medium}
                      onChange={(e) => setSingleUTM(prev => ({ ...prev, medium: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="campaign">UTM Campaign *</Label>
                  <Input
                    id="campaign"
                    placeholder="Nome da campanha"
                    value={singleUTM.campaign}
                    onChange={(e) => setSingleUTM(prev => ({ ...prev, campaign: e.target.value }))}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="term">UTM Term</Label>
                    <Input
                      id="term"
                      placeholder="Palavra-chave"
                      value={singleUTM.term}
                      onChange={(e) => setSingleUTM(prev => ({ ...prev, term: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="content">UTM Content</Label>
                    <Input
                      id="content"
                      placeholder="Variação de conteúdo"
                      value={singleUTM.content}
                      onChange={(e) => setSingleUTM(prev => ({ ...prev, content: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Extra fields for single UTM */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Campos extras (opcional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addExtraField(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar campo
                    </Button>
                  </div>
                  
                  {singleExtraFields.map((field) => (
                    <div key={field.id} className="flex gap-2">
                      <Input
                        placeholder="chave (ex: aff_id)"
                        value={field.key}
                        onChange={(e) => updateExtraField(field.id, { key: e.target.value }, true)}
                        className={!validateExtraKey(field.key) && field.key ? "border-red-500" : ""}
                      />
                      <Input
                        placeholder="valor"
                        value={field.value}
                        onChange={(e) => updateExtraField(field.id, { value: e.target.value }, true)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeExtraField(field.id, true)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>URL Gerada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm break-all">
                    {generateSingleUTM(false) || "Preencha os campos obrigatórios para gerar a URL"}
                  </p>
                </div>
                
                <Button 
                  onClick={() => {
                    const url = generateSingleUTM(true);
                    if (url) {
                      copyToClipboard(url);
                    }
                  }}
                  className="w-full"
                  disabled={!generateSingleUTM(false)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar URL
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          {/* Header Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bulk-url">Website URL *</Label>
                <Input
                  id="bulk-url"
                  type="url"
                  placeholder="https://exemplo.com"
                  value={bulkUTM.url}
                  onChange={(e) => setBulkUTM(prev => ({ ...prev, url: e.target.value }))}
                />
                {isHotmartUrl(bulkUTM.url) && (
                  <Alert className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      ⚠️ Link da Hotmart detectado → os parâmetros utm serão mantidos e será adicionado o campo sck.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="bulk-campaign">UTM Campaign (Projeto) *</Label>
                  <Input
                    id="bulk-campaign"
                    placeholder="Nome do projeto"
                    value={bulkUTM.campaign}
                    onChange={(e) => setBulkUTM(prev => ({ ...prev, campaign: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="bulk-term">UTM Term *</Label>
                  <Input
                    id="bulk-term"
                    placeholder="Pago/Orgânico"
                    value={bulkUTM.term}
                    onChange={(e) => setBulkUTM(prev => ({ ...prev, term: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="bulk-content">UTM Content (opcional)</Label>
                  <Input
                    id="bulk-content"
                    placeholder="Variação de conteúdo"
                    value={bulkUTM.content}
                    onChange={(e) => setBulkUTM(prev => ({ ...prev, content: e.target.value }))}
                  />
                </div>
              </div>

              {/* Extra fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Campos extras (opcional)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addExtraField(false)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar campo
                  </Button>
                </div>
                
                {extraFields.map((field) => (
                  <div key={field.id} className="flex gap-2">
                    <Input
                      placeholder="chave (ex: aff_id)"
                      value={field.key}
                      onChange={(e) => updateExtraField(field.id, { key: e.target.value })}
                      className={!validateExtraKey(field.key) && field.key ? "border-red-500" : ""}
                    />
                    <Input
                      placeholder="valor"
                      value={field.value}
                      onChange={(e) => updateExtraField(field.id, { value: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeExtraField(field.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {extraFields.some(field => field.key && !validateExtraKey(field.key)) && (
                  <p className="text-sm text-red-500">
                    Chaves devem conter apenas letras minúsculas, números e underscore.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Source Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Seleção de Canais</span>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-sources"
                    checked={selectAllSources}
                    onCheckedChange={handleSelectAllSources}
                  />
                  <Label htmlFor="select-all-sources" className="text-sm font-normal">
                    Selecionar todas as fontes
                  </Label>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(sourceMediumMap).map(([source, mediums]) => (
                  <div key={source} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={source}
                          checked={source in selectedSources && selectedSources[source].length > 0}
                          onCheckedChange={(checked) => handleSourceToggle(source, checked as boolean)}
                        />
                        <Label htmlFor={source} className="font-medium">
                          {source}
                        </Label>
                      </div>
                      
                      {source in selectedSources && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectAllMediums(source, selectedSources[source].length !== mediums.length)}
                          className="text-xs h-6 px-2"
                        >
                          {selectedSources[source].length === mediums.length ? "Desmarcar" : "Todas"}
                        </Button>
                      )}
                    </div>
                    
                    {source in selectedSources && (
                      <div className="ml-6 space-y-2">
                        {mediums.map(medium => (
                          <div key={medium} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${source}-${medium}`}
                              checked={selectedSources[source]?.includes(medium) || false}
                              onCheckedChange={(checked) => handleMediumToggle(source, medium, checked as boolean)}
                            />
                            <Label htmlFor={`${source}-${medium}`} className="text-sm">
                              {medium}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <Button onClick={generateBulkUTMs} className="w-full" size="lg">
                  <Zap className="h-4 w-4 mr-2" />
                  Gerar UTMs em Massa
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          {utmResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>UTMs Geradas ({utmResults.length})</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyAllUrls}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Todas
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToCsv}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Exportar Excel
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Medium</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>URL Final</TableHead>
                        <TableHead className="w-20">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {utmResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{result.source}</TableCell>
                          <TableCell>{result.medium}</TableCell>
                          <TableCell>{result.campaign}</TableCell>
                          <TableCell>{result.term}</TableCell>
                          <TableCell>{result.content || '-'}</TableCell>
                          <TableCell className="max-w-md">
                            <div className="truncate" title={result.url}>
                              {result.url}
                            </div>
                            {isHotmartUrl(result.url) && (
                              <Badge variant="outline" className="mt-1">
                                Hotmart + SCK
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => copyToClipboard(result.url)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};