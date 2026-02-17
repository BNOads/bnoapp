import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const SyncMetaAdsButton = () => {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSync = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
                body: { trigger_source: 'manual' }
            });

            if (error) throw error;

            toast({
                title: "Sincronização iniciada",
                description: "Os dados estão sendo atualizados. Isso pode levar alguns minutos.",
            });
        } catch (error: any) {
            console.error('Erro ao sincronizar:', error);
            toast({
                title: "Erro na sincronização",
                description: error.message || "Falha ao conectar com o servidor.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={loading}
            className="flex items-center gap-2"
        >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Sincronizando...' : 'Sincronizar Agora'}
        </Button>
    );
};
