import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle, AlertCircle, Video, Clock, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface DownloadHistoryItem {
  url: string;
  platform: string;
  timestamp: number;
  filename?: string;
  method?: string;
}

export const DownloaderCriativosView = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [downloadMethod, setDownloadMethod] = useState<string>("");
  const [history, setHistory] = useState<DownloadHistoryItem[]>(() => {
    const saved = localStorage.getItem("download-history");
    return saved ? JSON.parse(saved) : [];
  });

  const detectPlatform = (url: string): string | null => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
    if (url.includes("instagram.com")) return "instagram";
    if (url.includes("facebook.com/ads/library")) return "meta";
    return null;
  };

  const getPlatformBadge = (platform: string) => {
    const config = {
      youtube: { label: "YouTube", className: "bg-red-500" },
      instagram: { label: "Instagram", className: "bg-gradient-to-r from-purple-500 to-pink-500" },
      meta: { label: "Meta Ads", className: "bg-blue-500" }
    };
    const { label, className } = config[platform as keyof typeof config] || { label: platform, className: "bg-gray-500" };
    return <Badge className={className}>{label}</Badge>;
  };

  const addToHistory = (url: string, platform: string, filename?: string, method?: string) => {
    const newItem: DownloadHistoryItem = {
      url,
      platform,
      timestamp: Date.now(),
      filename,
      method
    };
    const newHistory = [newItem, ...history].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem("download-history", JSON.stringify(newHistory));
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira um link válido.",
        variant: "destructive"
      });
      return;
    }

    const platform = detectPlatform(url);
    if (!platform) {
      toast({
        title: "Plataforma não suportada",
        description: "Suportamos apenas YouTube, Instagram e Meta Ad Library.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setDownloadUrl(null);
    setFileName("");
    setDownloadMethod("");

    try {
      console.log("🎥 Iniciando download de:", url);
      
      const { data, error } = await supabase.functions.invoke("download-video", {
        body: { url, platform }
      });

      if (error) throw error;

      if (data.success) {
        setDownloadUrl(data.downloadUrl);
        setFileName(data.fileName || `video_${Date.now()}.mp4`);
        setDownloadMethod(data.method || "Método desconhecido");
        addToHistory(url, platform, data.fileName, data.method);
        
        toast({
          title: "✅ Download pronto!",
          description: `Método: ${data.method || "padrão"}`
        });
      } else {
        // Exibe mensagem de erro específica vinda da função
        throw new Error(data.error || "Erro ao processar vídeo");
      }
    } catch (error: any) {
      console.error("❌ Erro no download:", error);
      
      // Mensagem mais amigável baseada no tipo de erro
      let errorMessage = error.message;
      if (error.message === "Failed to send a request to the Edge Function") {
        errorMessage = "Não conseguimos contatar o serviço de download. Tente novamente em alguns segundos.";
      }
      
      toast({
        title: "Erro ao baixar vídeo",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Downloader de Criativos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">URL do Vídeo</label>
            <div className="flex gap-2">
              <Input
                placeholder="Cole aqui o link do vídeo (YouTube, Instagram ou Meta Ad Library)..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleDownload()}
              />
              <Button
                onClick={handleDownload}
                disabled={isLoading || !url.trim()}
                className="min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Baixando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Vídeo
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Compatível com YouTube, Instagram e Biblioteca de Anúncios Meta.
            </p>
          </div>

          {downloadUrl && (
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Vídeo pronto para download!
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {fileName}
                      </p>
                      {downloadMethod && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          📡 Método: {downloadMethod}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleFileDownload} className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Arquivo (.mp4)
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(downloadUrl);
                          toast({
                            title: "URL copiada!",
                            description: "Link do vídeo copiado para a área de transferência."
                          });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Processando vídeo... Isso pode levar alguns segundos.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-4 w-4" />
              Últimos Downloads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Video className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getPlatformBadge(item.platform)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <p className="text-sm truncate">{item.url}</p>
                    {item.filename && (
                      <p className="text-xs text-muted-foreground">{item.filename}</p>
                    )}
                    {item.method && (
                      <p className="text-xs text-muted-foreground">📡 {item.method}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUrl(item.url)}
                  >
                    Repetir
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Video className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-900 dark:text-red-100">YouTube</h3>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">
              Vídeos regulares, Shorts e lives. Qualidade até 720p.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Video className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">Instagram</h3>
            </div>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Posts, Reels e Stories. Suporta carrosséis.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Video className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Meta Ads</h3>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Anúncios da Biblioteca de Anúncios do Facebook.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Como usar:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Cole o link do vídeo no campo acima</li>
                <li>Clique em "Baixar Vídeo" e aguarde o processamento</li>
                <li>Quando pronto, clique em "Baixar Arquivo (.mp4)"</li>
                <li>O arquivo será salvo na sua máquina</li>
              </ol>
              <p className="mt-3 text-xs">
                <strong>Tecnologia:</strong> Sistema em camadas com RapidAPI (prioridade), APIs públicas e scraping como fallback. Retry automático e logs detalhados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
