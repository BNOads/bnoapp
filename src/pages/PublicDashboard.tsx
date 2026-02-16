import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ClientDashboardContent } from "@/components/Clientes/ClientDashboardContent";
import { Button } from "@/components/ui/button";

const PublicDashboard = () => {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [clientData, setClientData] = useState<any>(null);
    const [lancamentosAtivos, setLancamentosAtivos] = useState<any[]>([]);

    useEffect(() => {
        if (token) {
            loadClientFromToken();
        }
    }, [token]);

    const loadClientFromToken = async () => {
        setLoading(true);
        try {
            // 1. Resolve Token to Client ID
            const { data, error: funcError } = await supabase.rpc('get_client_by_public_token', {
                token_input: token
            });

            if (funcError) throw funcError;

            if (!data || data.length === 0) {
                setError("Link inválido ou expirado.");
                setLoading(false);
                return;
            }

            const { client_id } = data[0];

            // 2. Fetch Client Details (using public client if needed, or RLS allowed)
            // Since we have the ID, we can try fetching. 
            // NOTE: Clients table must be publicly readable for specific ID if we use standard client?
            // Or we can use the 'get_client_by_public_token' to return MORE data?
            // 'get_client_by_public_token' strictly returns ID/Name/Slug.
            // We need more data for the dashboard (whatsapp_grupo_url, etc).
            // We will try standard fetch. If it fails due to RLS, we might need to adjust RLS 
            // to allow reading Client if we have a valid Token in client_public_panel?
            // Or just fetch with a service role function? (Avoid if possible).
            // Let's assume for now that if we have the ID, we can fetch public fields.

            const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
            const publicSupabase = createPublicSupabaseClient();

            const { data: client, error: clientError } = await publicSupabase
                .from('clientes')
                .select('*')
                .eq('id', client_id)
                .single();

            if (clientError) throw clientError;
            setClientData(client);

            // 3. Fetch Lancamentos
            const { data: lancamentos } = await publicSupabase
                .from('lancamentos')
                .select('*')
                .eq('cliente_id', client_id)
                .eq('ativo', true)
                .in('status_lancamento', ['em_captacao', 'cpl', 'remarketing'])
                .order('data_inicio_captacao', { ascending: false });

            setLancamentosAtivos(lancamentos || []);

        } catch (err: any) {
            console.error("Erro ao carregar dashboard público:", err);
            setError("Erro ao carregar o painel via token.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !clientData) {
        return (
            <div className="flex flex-col justify-center items-center h-screen p-4 text-center">
                <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
                <p className="text-muted-foreground mb-4">{error || "Painel não encontrado."}</p>
                <Button onClick={() => window.location.href = '/'}>Ir para Home</Button>
            </div>
        );
    }

    return (
        <ClientDashboardContent
            cliente={clientData}
            lancamentosAtivos={lancamentosAtivos}
            isAuthenticated={false} // Always false for public token view
            canCreateContent={false}
            currentUser={null}
            currentColaboradorId={null}
            onEditClient={() => { }}
            onShare={() => {
                // Maybe copy the CURRENT url (with token)
                navigator.clipboard.writeText(window.location.href);
            }}
            onNavigateBack={() => { }}
        />
    );
};

export default PublicDashboard;
