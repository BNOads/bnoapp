import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Youtube, Instagram, Facebook, Loader2, ArrowLeft, Disc } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const CreativeDownloaderView = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async () => {
        if (!url) {
            toast({
                title: "URL inválida",
                description: "Por favor, insira uma URL válida.",
                variant: "destructive",
            });
            return;
        }



        setIsLoading(true);

        try {
            console.log("Iniciando download para:", url);

            // Using Supabase Edge Function proxy
            const { data, error } = await supabase.functions.invoke('fastsaver-proxy', {
                body: { url },
            });

            if (error) {
                console.error("Proxy error:", error);
                throw new Error("Erro ao conectar com o servidor proxy: " + error.message);
            }

            console.log("API Response:", data);

            if (data.error) {
                throw new Error(data.message || "Erro retornado pela API.");
            }

            // Handle YouTube specific message or limitation
            if (data.hosting === 'youtube') {
                if (data.message && data.message.includes("/download")) {
                    toast({
                        title: "YouTube Download",
                        description: "O download direto do YouTube via web não é suportado por esta API (requer bot Telegram). Tente outro link ou plataforma.",
                        variant: "warning",
                    });
                    // If no download_url is present, return early to avoid error
                    if (!data.download_url && !data.url) return;
                }
            }

            // Logic to find the best download link
            let downloadLink = "";

            if (data.download_url) {
                downloadLink = data.download_url;
            } else if (data.url) {
                downloadLink = data.url;
            }

            if (downloadLink) {
                // Open in new tab which is safer for CORS/Downloads
                window.open(downloadLink, '_blank');

                toast({
                    title: "Sucesso!",
                    description: "Seu vídeo foi aberto em uma nova aba.",
                });
            } else {
                console.error("Nenhum link encontrado na resposta:", data);
                // If we already showed a toast for YouTube, don't throw detailed error
                if (data.hosting === 'youtube') return;

                throw new Error("Link de download não encontrado na resposta.");
            }

        } catch (error: any) {
            console.error("Download error:", error);
            toast({
                title: "Erro no download",
                description: error.message || "Não foi possível baixar o vídeo. Verifique o console para mais detalhes.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit pl-0 hover:bg-transparent hover:text-primary transition-colors"
                    onClick={() => navigate("/ferramentas")}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar às Ferramentas
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Downloader de Criativos</h1>
                    <p className="text-muted-foreground mt-1 text-lg">
                        Baixe vídeos de YouTube, Instagram e Meta Ad Library em MP4
                    </p>
                </div>
            </div>

            {/* Main Card */}
            <Card className="border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-primary" />
                        Downloader de Criativos
                    </CardTitle>
                    <CardDescription>
                        Cole a URL do vídeo que deseja baixar
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            URL do Vídeo
                        </label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Cole aqui o link do vídeo (YouTube, Instagram ou Meta Ad Library)..."
                                className="h-12 text-lg"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                            <Button
                                size="lg"
                                className="h-12 px-8 font-semibold shadow-md active:scale-95 transition-all"
                                onClick={handleDownload}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        Baixar Vídeo
                                    </>
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Compatível com YouTube, Instagram e Biblioteca de Anúncios Meta.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Info Cards */}
            <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                            <Youtube className="h-5 w-5" />
                            YouTube
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-balance text-muted-foreground">
                            Vídeos regulares, Shorts e lives. Qualidade até 720p.
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                            <Instagram className="h-5 w-5" />
                            Instagram
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-balance text-muted-foreground">
                            Posts, Reels e Stories. Suporta carrosséis.
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <Disc className="h-5 w-5" />
                            Meta Ads
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-balance text-muted-foreground">
                            Anúncios da Biblioteca de Anúncios do Facebook.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
