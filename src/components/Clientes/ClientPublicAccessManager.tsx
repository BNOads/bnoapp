import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Copy, RefreshCw, Eye, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClientPublicAccessManagerProps {
    clientId: string;
}

export const ClientPublicAccessManager = ({ clientId }: ClientPublicAccessManagerProps) => {
    const [loading, setLoading] = useState(false);
    const [accessData, setAccessData] = useState<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        loadAccessData();
    }, [clientId]);

    const loadAccessData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('client_public_panel')
                .select('*')
                .eq('client_id', clientId)
                .maybeSingle();

            if (error) throw error;
            setAccessData(data);
        } catch (error) {
            console.error('Erro ao carregar dados de acesso público:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateToken = () => {
        return crypto.randomUUID();
    };

    const handleGenerateAccess = async () => {
        setLoading(true);
        try {
            const token = generateToken();
            const { data, error } = await supabase
                .from('client_public_panel')
                .upsert({
                    client_id: clientId,
                    public_token: token,
                    is_active: true
                })
                .select()
                .single();

            if (error) throw error;
            setAccessData(data);
            toast({
                title: "Acesso gerado",
                description: "O link público foi gerado com sucesso.",
            });
        } catch (error: any) {
            toast({
                title: "Erro",
                description: `Erro ao gerar acesso: ${error.message}`,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (checked: boolean) => {
        if (!accessData) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('client_public_panel')
                .update({ is_active: checked })
                .eq('id', accessData.id);

            if (error) throw error;
            setAccessData({ ...accessData, is_active: checked });
            toast({
                title: checked ? "Acesso ativado" : "Acesso desativado",
                description: checked ? "O painel está acessível publicamente." : "O painel não pode mais ser acessado publicamente.",
            });
        } catch (error: any) {
            toast({
                title: "Erro",
                description: "Erro ao atualizar status.",
                variant: "destructive"
            });
            // Revert opt-interfacially? 
            loadAccessData();
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateToken = async () => {
        if (!confirm("Tem certeza? O link antigo deixará de funcionar imediatamente.")) return;
        handleGenerateAccess();
    };

    const copyLink = () => {
        if (!accessData?.public_token) return;
        const link = `${window.location.origin}/painel-publico/${accessData.public_token}`;
        navigator.clipboard.writeText(link);
        toast({
            title: "Link copiado",
            description: "Link copiado para a área de transferência.",
        });
    };

    const publicLink = accessData?.public_token
        ? `${window.location.origin}/painel-publico/${accessData.public_token}`
        : '';

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Acesso Público do Painel
                </CardTitle>
                <CardDescription>
                    Gerencie o link de acesso externo para este cliente (visualização somente leitura).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading && !accessData ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : !accessData ? (
                    <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-4">Nenhum acesso público configurado.</p>
                        <Button onClick={handleGenerateAccess}>
                            Gerar Link de Acesso
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Acesso Ativo</Label>
                                <p className="text-sm text-muted-foreground">
                                    Se desativado, o link exibirá uma mensagem de erro.
                                </p>
                            </div>
                            <Switch
                                checked={accessData.is_active}
                                onCheckedChange={handleToggleActive}
                                disabled={loading}
                            />
                        </div>

                        {accessData.is_active && (
                            <div className="space-y-2 pt-2">
                                <Label>Link de Acesso</Label>
                                <div className="flex gap-2">
                                    <Input readOnly value={publicLink} className="bg-muted" />
                                    <Button variant="outline" size="icon" onClick={copyLink} title="Copiar Link">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => window.open(publicLink, '_blank')} title="Abrir">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="pt-2">
                                    <Button variant="destructive" size="sm" onClick={handleRegenerateToken} disabled={loading} className="w-full sm:w-auto">
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Resetar Link
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Resetar o link invalidará o acesso anterior. Use isso se o link tiver vazado.
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};
