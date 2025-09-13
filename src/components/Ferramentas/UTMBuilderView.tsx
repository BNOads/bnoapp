import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, Link, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UTMResult {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  url: string;
}

interface SourceMediumOptions {
  [key: string]: string[];
}

const sourceMediumMap: SourceMediumOptions = {
  facebook: ["cpc", "stories", "feed", "reels", "banner"],
  instagram: ["cpc", "stories", "feed", "reels", "influencer"],
  google: ["cpc", "display", "search", "shopping", "youtube"],
  linkedin: ["cpc", "sponsored", "message", "event"],
  tiktok: ["cpc", "stories", "feed", "influencer"],
  twitter: ["cpc", "promoted", "card"],
  email: ["newsletter", "automation", "campaign", "transactional"],
  whatsapp: ["broadcast", "status", "group"],
  telegram: ["channel", "group", "bot"],
  sms: ["bulk", "automation", "transactional"],
  affiliate: ["banner", "link", "cashback", "influencer"],
  organic: ["post", "story", "video", "blog"]
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
    term: ""
  });
  
  const [selectedSources, setSelectedSources] = useState<{[key: string]: string[]}>({});
  const [utmResults, setUtmResults] = useState<UTMResult[]>([]);

  const generateSingleUTM = () => {
    if (!singleUTM.url || !singleUTM.source || !singleUTM.medium || !singleUTM.campaign) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha URL, Source, Medium e Campaign",
        variant: "destructive"
      });
      return "";
    }

    const baseUrl = singleUTM.url.includes("?") ? singleUTM.url : singleUTM.url + "?";
    const params = new URLSearchParams();
    
    params.set("utm_source", singleUTM.source.toLowerCase().replace(/\s+/g, "_"));
    params.set("utm_medium", singleUTM.medium.toLowerCase().replace(/\s+/g, "_"));
    params.set("utm_campaign", singleUTM.campaign.toLowerCase().replace(/\s+/g, "_"));
    
    if (singleUTM.term) params.set("utm_term", singleUTM.term.toLowerCase().replace(/\s+/g, "_"));
    if (singleUTM.content) params.set("utm_content", singleUTM.content.toLowerCase().replace(/\s+/g, "_"));

    return baseUrl + params.toString();
  };

  const generateBulkUTMs = () => {
    if (!bulkUTM.url || !bulkUTM.campaign || !bulkUTM.term) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha URL, Campaign e Term",
        variant: "destructive"
      });
      return;
    }

    const results: UTMResult[] = [];
    
    Object.entries(selectedSources).forEach(([source, mediums]) => {
      mediums.forEach(medium => {
        const baseUrl = bulkUTM.url.includes("?") ? bulkUTM.url : bulkUTM.url + "?";
        const params = new URLSearchParams();
        
        params.set("utm_source", source.toLowerCase());
        params.set("utm_medium", medium.toLowerCase());
        params.set("utm_campaign", bulkUTM.campaign.toLowerCase().replace(/\s+/g, "_"));
        params.set("utm_term", bulkUTM.term.toLowerCase().replace(/\s+/g, "_"));

        results.push({
          source,
          medium,
          campaign: bulkUTM.campaign,
          term: bulkUTM.term,
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
      "Source,Medium,Campaign,Term,URL",
      ...utmResults.map(r => `${r.source},${r.medium},${r.campaign},${r.term},"${r.url}"`)
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utm-builder-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            UTM Individual
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Fluxo em Massa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Gerador de UTM</CardTitle>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>URL Gerada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm break-all">
                    {generateSingleUTM() || "Preencha os campos obrigatórios para gerar a URL"}
                  </p>
                </div>
                
                {generateSingleUTM() && (
                  <Button 
                    onClick={() => copyToClipboard(generateSingleUTM())}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar URL
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
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
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
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
                    placeholder="Orgânico/Pago"
                    value={bulkUTM.term}
                    onChange={(e) => setBulkUTM(prev => ({ ...prev, term: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seleção de Canais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(sourceMediumMap).map(([source, mediums]) => (
                  <div key={source} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={source}
                        checked={source in selectedSources}
                        onCheckedChange={(checked) => handleSourceToggle(source, checked as boolean)}
                      />
                      <Label htmlFor={source} className="font-medium capitalize">
                        {source}
                      </Label>
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
                <Button onClick={generateBulkUTMs} className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Gerar UTMs em Massa
                </Button>
              </div>
            </CardContent>
          </Card>

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
                          <TableCell className="max-w-md truncate">
                            {result.url}
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