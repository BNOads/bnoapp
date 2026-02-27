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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Copy, Download, Link, Zap, Plus, X, AlertTriangle, FileSpreadsheet,
  ExternalLink, Pencil, Trash2, Search, Share2, MousePointerClick, Code, Tags, ChevronDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

interface RedirectLink {
  id: string;
  slug: string;
  destination_url: string;
  title: string | null;
  click_count: number;
  fb_pixel_id: string | null;
  fb_pixel_event: string | null;
  gtm_id: string | null;
  custom_script: string | null;
  created_by: string;
  created_at: string;
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

const APP_DOMAIN = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '') ?? window.location.origin;

const generateSlug = (len = 7) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
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

  const [selectedSources, setSelectedSources] = useState<{ [key: string]: string[] }>({});
  const [selectAllSources, setSelectAllSources] = useState(false);
  const [utmResults, setUtmResults] = useState<UTMResult[]>([]);
  const [extraFields, setExtraFields] = useState<ExtraField[]>([]);
  const [singleExtraFields, setSingleExtraFields] = useState<ExtraField[]>([]);

  // Redirect state
  const [redirects, setRedirects] = useState<RedirectLink[]>([]);
  const [redirectSearch, setRedirectSearch] = useState("");
  const [creatingRedirect, setCreatingRedirect] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<RedirectLink | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    fb_pixel_id: "",
    fb_pixel_event: "PageView",
    gtm_id: "",
    custom_script: "",
  });
  const [loadingRedirects, setLoadingRedirects] = useState(true);

  // Load redirects
  useEffect(() => {
    fetchRedirects();
  }, []);

  const fetchRedirects = async () => {
    setLoadingRedirects(true);
    const { data } = await supabase
      .from("utm_redirects")
      .select("*")
      .order("created_at", { ascending: false });
    setRedirects((data as RedirectLink[]) || []);
    setLoadingRedirects(false);
  };

  // Check if URL is Hotmart
  const isHotmartUrl = (url: string) => {
    return url.toLowerCase().includes('hotmart');
  };

  // Normalize text for URL params
  const normalizeParam = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const generateSckParam = (source: string, medium: string, campaign: string, term: string, content: string) => {
    const parts = [
      normalizeParam(source),
      normalizeParam(medium),
      normalizeParam(campaign),
      normalizeParam(term),
      normalizeParam(content)
    ].filter(part => part.length > 0);
    return parts.join('|');
  };

  const validateExtraKey = (key: string) => {
    return /^[a-z0-9_]+$/.test(key);
  };

  const addExtraField = (isSingle = false) => {
    const newField: ExtraField = { id: Date.now().toString(), key: '', value: '' };
    if (isSingle) setSingleExtraFields(prev => [...prev, newField]);
    else setExtraFields(prev => [...prev, newField]);
  };

  const removeExtraField = (id: string, isSingle = false) => {
    if (isSingle) setSingleExtraFields(prev => prev.filter(f => f.id !== id));
    else setExtraFields(prev => prev.filter(f => f.id !== id));
  };

  const updateExtraField = (id: string, updates: Partial<ExtraField>, isSingle = false) => {
    const fn = (prev: ExtraField[]) => prev.map(f => f.id === id ? { ...f, ...updates } : f);
    if (isSingle) setSingleExtraFields(fn);
    else setExtraFields(fn);
  };

  const generateSingleUTM = (showValidation = false) => {
    if (!singleUTM.url || !singleUTM.source || !singleUTM.medium || !singleUTM.campaign) {
      if (showValidation) {
        toast({ title: "Campos obrigatórios", description: "Preencha URL, Source, Medium e Campaign", variant: "destructive" });
      }
      return "";
    }

    const baseUrl = singleUTM.url.includes("?") ? singleUTM.url : singleUTM.url + "?";
    const params = new URLSearchParams();
    params.set("utm_source", normalizeParam(singleUTM.source));
    params.set("utm_medium", normalizeParam(singleUTM.medium));
    params.set("utm_campaign", normalizeParam(singleUTM.campaign));
    if (singleUTM.term) params.set("utm_term", normalizeParam(singleUTM.term));
    if (singleUTM.content) params.set("utm_content", normalizeParam(singleUTM.content));

    singleExtraFields.forEach(field => {
      if (field.key && field.value && validateExtraKey(field.key)) {
        params.set(field.key, encodeURIComponent(field.value));
      }
    });

    if (isHotmartUrl(singleUTM.url)) {
      const sck = generateSckParam(singleUTM.source, singleUTM.medium, singleUTM.campaign, singleUTM.term || '', singleUTM.content || '');
      if (sck) params.set("sck", sck);
    }

    return baseUrl + params.toString();
  };

  // Create redirect
  const createRedirect = async () => {
    const url = generateSingleUTM(true);
    if (!url) return;

    setCreatingRedirect(true);
    const { data: { user } } = await supabase.auth.getUser();

    let slug = generateSlug();
    // ensure uniqueness
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase.from("utm_redirects").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = generateSlug();
      attempts++;
    }

    const { data, error } = await supabase.from("utm_redirects").insert({
      slug,
      destination_url: url,
      created_by: user?.id,
      title: `UTM - ${normalizeParam(singleUTM.campaign || 'redirect')}`,
    }).select().single();

    setCreatingRedirect(false);

    if (error || !data) {
      toast({ title: "Erro", description: "Não foi possível criar o redirect.", variant: "destructive" });
      return;
    }

    toast({ title: "Redirect criado!", description: `Link: ${APP_DOMAIN}/d/${slug}` });
    fetchRedirects();
  };

  const deleteRedirect = async (id: string) => {
    await supabase.from("utm_redirects").delete().eq("id", id);
    setRedirects(prev => prev.filter(r => r.id !== id));
    toast({ title: "Redirect removido" });
  };

  const openEditModal = (r: RedirectLink) => {
    setEditingRedirect(r);
    setEditForm({
      title: r.title || "",
      fb_pixel_id: r.fb_pixel_id || "",
      fb_pixel_event: r.fb_pixel_event || "PageView",
      gtm_id: r.gtm_id || "",
      custom_script: r.custom_script || "",
    });
  };

  const saveEdit = async () => {
    if (!editingRedirect) return;
    const { error } = await supabase.from("utm_redirects").update({
      title: editForm.title || null,
      fb_pixel_id: editForm.fb_pixel_id || null,
      fb_pixel_event: editForm.fb_pixel_event || "PageView",
      gtm_id: editForm.gtm_id || null,
      custom_script: editForm.custom_script || null,
      updated_at: new Date().toISOString(),
    }).eq("id", editingRedirect.id);

    if (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
      return;
    }

    setEditingRedirect(null);
    fetchRedirects();
    toast({ title: "Redirect atualizado!" });
  };

  const copyToClipboard = (text: string, label = "URL copiada") => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: label });
  };

  const shareRedirect = async (slug: string) => {
    const url = `${APP_DOMAIN}/d/${slug}`;
    if (navigator.share) {
      await navigator.share({ url });
    } else {
      copyToClipboard(url, "Link copiado para compartilhar");
    }
  };

  const handleSelectAllSources = (checked: boolean) => {
    setSelectAllSources(checked);
    if (checked) {
      const all: { [key: string]: string[] } = {};
      Object.keys(sourceMediumMap).forEach(s => { all[s] = [...sourceMediumMap[s]]; });
      setSelectedSources(all);
    } else {
      setSelectedSources({});
    }
  };

  const handleSelectAllMediums = (source: string, checked: boolean) => {
    setSelectedSources(prev => {
      const n = { ...prev };
      if (checked) n[source] = [...sourceMediumMap[source]];
      else n[source] = [];
      return n;
    });
  };

  useEffect(() => {
    const allSelected = Object.keys(sourceMediumMap).every(s => s in selectedSources && selectedSources[s].length > 0);
    setSelectAllSources(allSelected && Object.keys(selectedSources).length === Object.keys(sourceMediumMap).length);
  }, [selectedSources]);

  const generateBulkUTMs = () => {
    if (!bulkUTM.url) {
      toast({ title: "Campo obrigatório", description: "Preencha a URL", variant: "destructive" });
      return;
    }
    const results: UTMResult[] = [];
    Object.entries(selectedSources).forEach(([source, mediums]) => {
      mediums.forEach(medium => {
        const baseUrl = bulkUTM.url.includes("?") ? bulkUTM.url : bulkUTM.url + "?";
        const params = new URLSearchParams();
        params.set("utm_source", normalizeParam(source));
        params.set("utm_medium", normalizeParam(medium));
        if (bulkUTM.campaign) params.set("utm_campaign", normalizeParam(bulkUTM.campaign));
        if (bulkUTM.term) params.set("utm_term", normalizeParam(bulkUTM.term));
        if (bulkUTM.content) params.set("utm_content", normalizeParam(bulkUTM.content));
        extraFields.forEach(field => {
          if (field.key && field.value && validateExtraKey(field.key)) params.set(field.key, encodeURIComponent(field.value));
        });
        if (isHotmartUrl(bulkUTM.url)) {
          const sck = generateSckParam(source, medium, bulkUTM.campaign || '', bulkUTM.term || '', bulkUTM.content || '');
          if (sck) params.set("sck", sck);
        }
        results.push({ source, medium, campaign: bulkUTM.campaign || '', term: bulkUTM.term || '', content: bulkUTM.content || '', url: baseUrl + params.toString() });
      });
    });
    setUtmResults(results);
    if (results.length > 0) toast({ title: "UTMs geradas", description: `${results.length} URLs criadas com sucesso` });
  };

  const copyAllUrls = () => {
    navigator.clipboard.writeText(utmResults.map(r => r.url).join("\n"));
    toast({ title: "Todas as URLs copiadas!", description: `${utmResults.length} URLs copiadas` });
  };

  const exportToCsv = () => {
    const csv = ["Source,Medium,Campaign,Term,Content,URL Final", ...utmResults.map(r => `${r.source},${r.medium},${r.campaign},${r.term},${r.content},"${r.url}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `utm-builder-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(utmResults.map(r => ({ Source: r.source, Medium: r.medium, Campaign: r.campaign, Term: r.term, Content: r.content, 'URL Final': r.url })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "UTMs");
    XLSX.writeFile(wb, `utm-builder-${Date.now()}.xlsx`);
  };

  const handleSourceToggle = (source: string, checked: boolean) => {
    setSelectedSources(prev => {
      const n = { ...prev };
      if (checked) n[source] = sourceMediumMap[source] || [];
      else delete n[source];
      return n;
    });
  };

  const handleMediumToggle = (source: string, medium: string, checked: boolean) => {
    setSelectedSources(prev => {
      const n = { ...prev };
      if (!n[source]) n[source] = [];
      if (checked) { if (!n[source].includes(medium)) n[source] = [...n[source], medium]; }
      else {
        n[source] = n[source].filter(m => m !== medium);
        if (n[source].length === 0) delete n[source];
      }
      return n;
    });
  };

  const filteredRedirects = redirects.filter(r => {
    const q = redirectSearch.toLowerCase();
    return !q || r.slug.includes(q) || r.destination_url.toLowerCase().includes(q) || (r.title || "").toLowerCase().includes(q);
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR");
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
                    <Input id="source" placeholder="ex: facebook, google" value={singleUTM.source} onChange={(e) => setSingleUTM(prev => ({ ...prev, source: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="medium">UTM Medium *</Label>
                    <Input id="medium" placeholder="ex: cpc, email, social" value={singleUTM.medium} onChange={(e) => setSingleUTM(prev => ({ ...prev, medium: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="campaign">UTM Campaign *</Label>
                  <Input id="campaign" placeholder="Nome da campanha" value={singleUTM.campaign} onChange={(e) => setSingleUTM(prev => ({ ...prev, campaign: e.target.value }))} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="term">UTM Term</Label>
                    <Input id="term" placeholder="Palavra-chave" value={singleUTM.term} onChange={(e) => setSingleUTM(prev => ({ ...prev, term: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="content">UTM Content</Label>
                    <Input id="content" placeholder="Variação de conteúdo" value={singleUTM.content} onChange={(e) => setSingleUTM(prev => ({ ...prev, content: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Campos extras (opcional)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => addExtraField(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar campo
                    </Button>
                  </div>
                  {singleExtraFields.map((field) => (
                    <div key={field.id} className="flex gap-2">
                      <Input placeholder="chave (ex: aff_id)" value={field.key} onChange={(e) => updateExtraField(field.id, { key: e.target.value }, true)} className={!validateExtraKey(field.key) && field.key ? "border-red-500" : ""} />
                      <Input placeholder="valor" value={field.value} onChange={(e) => updateExtraField(field.id, { value: e.target.value }, true)} />
                      <Button type="button" variant="outline" size="sm" onClick={() => removeExtraField(field.id, true)}><X className="h-4 w-4" /></Button>
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
                <div className="p-4 bg-muted rounded-lg min-h-[80px]">
                  <p className="text-sm break-all">
                    {generateSingleUTM(false) || "Preencha os campos obrigatórios para gerar a URL"}
                  </p>
                </div>

                <Button
                  onClick={() => { const url = generateSingleUTM(true); if (url) copyToClipboard(url, "URL com UTM copiada"); }}
                  className="w-full"
                  disabled={!generateSingleUTM(false)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar URL
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!generateSingleUTM(false) || creatingRedirect}
                  onClick={createRedirect}
                >
                  {creatingRedirect ? (
                    <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />Criando...</>
                  ) : (
                    <><ExternalLink className="h-4 w-4 mr-2" />Criar Redirect</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Redirect Links List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-yellow-500" />
                  Meus Redirect Links
                  {!loadingRedirects && (
                    <Badge variant="secondary">{redirects.length}</Badge>
                  )}
                </span>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por slug, URL..."
                    className="pl-9 h-9 text-sm"
                    value={redirectSearch}
                    onChange={(e) => setRedirectSearch(e.target.value)}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRedirects ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredRedirects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ExternalLink className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">{redirectSearch ? "Nenhum redirect encontrado." : "Nenhum redirect criado ainda. Gere uma URL UTM e clique em \"Criar Redirect\"."}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRedirects.map((r) => {
                    const shortUrl = `${APP_DOMAIN}/d/${r.slug}`;
                    const hasTracking = !!(r.fb_pixel_id || r.gtm_id || r.custom_script);
                    return (
                      <div key={r.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-sm font-bold bg-muted px-2 py-0.5 rounded text-yellow-600">
                                /d/{r.slug}
                              </code>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MousePointerClick className="h-3 w-3" />
                                {r.click_count} clique(s)
                              </span>
                              {hasTracking && (
                                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                  <Code className="h-3 w-3" />
                                  Scripts ativos
                                </span>
                              )}
                              {r.fb_pixel_id && (
                                <Badge variant="outline" className="text-xs py-0">FB Pixel</Badge>
                              )}
                              {r.gtm_id && (
                                <Badge variant="outline" className="text-xs py-0">GTM</Badge>
                              )}
                            </div>
                            <a
                              href={shortUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-yellow-600 hover:underline font-medium block truncate"
                            >
                              {shortUrl}
                            </a>
                            <p className="text-xs text-muted-foreground truncate" title={r.destination_url}>
                              → {r.destination_url}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(r.created_at)}</span>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(shortUrl, `Link /d/${r.slug} copiado`)}>
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Copiar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => shareRedirect(r.slug)} title="Compartilhar">
                              <Share2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEditModal(r)} title="Editar / Configurar scripts">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteRedirect(r.id)} title="Apagar">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bulk-url">Website URL *</Label>
                <Input id="bulk-url" type="url" placeholder="https://exemplo.com" value={bulkUTM.url} onChange={(e) => setBulkUTM(prev => ({ ...prev, url: e.target.value }))} />
                {isHotmartUrl(bulkUTM.url) && (
                  <Alert className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>⚠️ Link da Hotmart detectado → os parâmetros utm serão mantidos e será adicionado o campo sck.</AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="bulk-campaign">UTM Campaign (Projeto) *</Label>
                  <Input id="bulk-campaign" placeholder="Nome do projeto" value={bulkUTM.campaign} onChange={(e) => setBulkUTM(prev => ({ ...prev, campaign: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="bulk-term">UTM Term *</Label>
                  <Input id="bulk-term" placeholder="Pago/Orgânico" value={bulkUTM.term} onChange={(e) => setBulkUTM(prev => ({ ...prev, term: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="bulk-content">UTM Content (opcional)</Label>
                  <Input id="bulk-content" placeholder="Variação de conteúdo" value={bulkUTM.content} onChange={(e) => setBulkUTM(prev => ({ ...prev, content: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Campos extras (opcional)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => addExtraField(false)}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar campo
                  </Button>
                </div>
                {extraFields.map((field) => (
                  <div key={field.id} className="flex gap-2">
                    <Input placeholder="chave (ex: aff_id)" value={field.key} onChange={(e) => updateExtraField(field.id, { key: e.target.value })} className={!validateExtraKey(field.key) && field.key ? "border-red-500" : ""} />
                    <Input placeholder="valor" value={field.value} onChange={(e) => updateExtraField(field.id, { value: e.target.value })} />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeExtraField(field.id)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                {extraFields.some(f => f.key && !validateExtraKey(f.key)) && (
                  <p className="text-sm text-red-500">Chaves devem conter apenas letras minúsculas, números e underscore.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Seleção de Canais</span>
                <div className="flex items-center space-x-2">
                  <Checkbox id="select-all-sources" checked={selectAllSources} onCheckedChange={handleSelectAllSources} />
                  <Label htmlFor="select-all-sources" className="text-sm font-normal">Selecionar todas as fontes</Label>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(sourceMediumMap).map(([source, mediums]) => (
                  <div key={source} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox id={source} checked={source in selectedSources && selectedSources[source].length > 0} onCheckedChange={(c) => handleSourceToggle(source, c as boolean)} />
                        <Label htmlFor={source} className="font-medium">{source}</Label>
                      </div>
                      {source in selectedSources && (
                        <Button variant="ghost" size="sm" onClick={() => handleSelectAllMediums(source, selectedSources[source].length !== mediums.length)} className="text-xs h-6 px-2">
                          {selectedSources[source].length === mediums.length ? "Desmarcar" : "Todas"}
                        </Button>
                      )}
                    </div>
                    {source in selectedSources && (
                      <div className="ml-6 space-y-2">
                        {mediums.map(medium => (
                          <div key={medium} className="flex items-center space-x-2">
                            <Checkbox id={`${source}-${medium}`} checked={selectedSources[source]?.includes(medium) || false} onCheckedChange={(c) => handleMediumToggle(source, medium, c as boolean)} />
                            <Label htmlFor={`${source}-${medium}`} className="text-sm">{medium}</Label>
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

          {utmResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>UTMs Geradas ({utmResults.length})</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyAllUrls}><Copy className="h-4 w-4 mr-2" />Copiar Todas</Button>
                    <Button variant="outline" size="sm" onClick={exportToCsv}><Download className="h-4 w-4 mr-2" />Exportar CSV</Button>
                    <Button variant="outline" size="sm" onClick={exportToExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />Exportar Excel</Button>
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
                            <div className="truncate" title={result.url}>{result.url}</div>
                            {isHotmartUrl(result.url) && <Badge variant="outline" className="mt-1">Hotmart + SCK</Badge>}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(result.url)}><Copy className="h-4 w-4" /></Button>
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

      {/* Edit Redirect Modal */}
      <Dialog open={!!editingRedirect} onOpenChange={(open) => { if (!open) setEditingRedirect(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-yellow-500" />
              Configurar Redirect
              {editingRedirect && <code className="text-sm bg-muted px-2 py-0.5 rounded">/d/{editingRedirect.slug}</code>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div>
              <Label>Título (interno)</Label>
              <Input
                placeholder="Ex: Campanha Verão - Instagram Feed"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Tags className="h-4 w-4" />
                Rastreamento e Conversões
              </p>
              <div className="space-y-3">
                <div>
                  <Label>Facebook Pixel ID</Label>
                  <Input
                    placeholder="Ex: 123456789012345"
                    value={editForm.fb_pixel_id}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fb_pixel_id: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Disparado automaticamente ao acessar o link redirect</p>
                </div>
                {editForm.fb_pixel_id && (
                  <div>
                    <Label>Evento do Pixel</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={editForm.fb_pixel_event}
                      onChange={(e) => setEditForm(prev => ({ ...prev, fb_pixel_event: e.target.value }))}
                    >
                      <option value="PageView">PageView – Visualização de página</option>
                      <option value="Lead">Lead – Cadastro / formulário</option>
                      <option value="CompleteRegistration">CompleteRegistration – Registro completo</option>
                      <option value="Contact">Contact – Contato (WhatsApp, ligação…)</option>
                      <option value="InitiateCheckout">InitiateCheckout – Início de compra</option>
                      <option value="Purchase">Purchase – Compra realizada</option>
                      <option value="AddToCart">AddToCart – Adicionar ao carrinho</option>
                      <option value="ViewContent">ViewContent – Ver conteúdo</option>
                      <option value="Search">Search – Pesquisa</option>
                      <option value="Subscribe">Subscribe – Assinatura</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Qual evento disparar no Pixel ao acessar este link</p>
                  </div>
                )}
              </div>

              <div>
                <Label>Google Tag Manager ID</Label>
                <Input
                  placeholder="Ex: GTM-XXXXXXX"
                  value={editForm.gtm_id}
                  onChange={(e) => setEditForm(prev => ({ ...prev, gtm_id: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Carrega o GTM antes do redirecionamento</p>
              </div>
              <div>
                <Label>Script Personalizado</Label>
                <Textarea
                  placeholder={`<script>\n  // Seu código personalizado\n  console.log('redirect!');\n</script>`}
                  className="font-mono text-xs min-h-[100px]"
                  value={editForm.custom_script}
                  onChange={(e) => setEditForm(prev => ({ ...prev, custom_script: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">HTML/JS puro. Executado antes do redirect (ao seu risco).</p>
              </div>
            </div>

            {editingRedirect && (
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground font-medium mb-1">URL de destino</p>
                <p className="text-xs break-all text-muted-foreground bg-muted p-2 rounded">
                  {editingRedirect.destination_url}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingRedirect(null)}>Cancelar</Button>
              <Button onClick={saveEdit}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};