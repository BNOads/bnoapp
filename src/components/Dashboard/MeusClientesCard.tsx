import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, Activity, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/Auth/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface Cliente {
    id: string;
    nome: string;
    slug: string;
    status: 'ativo' | 'inativo' | 'churn';
}

export function MeusClientesCard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isAdmin, isMaster, isGestorProjetos } = useUserPermissions();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<'gestor' | 'cs' | 'admin' | null>(null);
    
    // Admin, Master ou Gestor de Projetos vê todos os clientes
    const canSeeAll = isAdmin || isMaster || isGestorProjetos;

    useEffect(() => {
        const fetchUserRoleAndClients = async () => {
            if (!user?.id) return;

            try {
                setLoading(true);

                if (canSeeAll) {
                    setUserRole('admin');
                    const { data: allClientes, error: clientesError } = await supabase
                        .from('clientes')
                        .select('id, nome, slug, status_cliente, ativo')
                        .eq('ativo', true)
                        .order('nome');

                    if (clientesError) throw clientesError;

                    setClientes(allClientes?.map(c => ({
                        id: c.id,
                        nome: c.nome,
                        slug: c.slug || '',
                        status: 'ativo'
                    })) || []);
                    return;
                }

                // 1. Fetch user's colaborador profile
                const { data: colaborador, error: colabErr } = await supabase
                    .from('colaboradores')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (colabErr) console.error("Error fetching colab:", colabErr);
                const colaboradorId = colaborador?.id;

                // 2. Fetch ALL active clients (using correct table columns)
                const { data: allClients, error: clientsError } = await supabase
                    .from('clientes')
                    .select('id, nome, slug, status_cliente, ativo, primary_gestor_user_id, primary_cs_user_id, traffic_manager_id, cs_id')
                    .eq('ativo', true);

                if (clientsError) {
                    console.error("Clients Fetch Error:", clientsError);
                    throw clientsError;
                }

                // 3. Filter clients in memory
                const idsToCheck = [user.id, colaboradorId]
                    .filter(Boolean)
                    .map(id => String(id).trim().toLowerCase());

                const directClients = (allClients || []).filter(client => {
                    const clientAssociatedIds = [
                        client.primary_gestor_user_id,
                        client.primary_cs_user_id,
                        client.traffic_manager_id,
                        client.cs_id
                    ]
                        .filter(Boolean)
                        .map(id => String(id).trim().toLowerCase());

                    return clientAssociatedIds.some(id => idsToCheck.includes(id));
                });

                // 4. Fetch clients linked via Roles table
                const { data: roleClients, error: rolesError } = await supabase
                    .from('client_roles')
                    .select('client_id, clientes(id, nome, slug, status_cliente)')
                    .in('user_id', idsToCheck);

                if (rolesError) console.error("Roles Fetch Error:", rolesError);

                // 5. Merge and Unique
                const allMyClients = [
                    ...directClients.map(c => ({
                        id: c.id,
                        nome: c.nome,
                        slug: c.slug || '',
                        status: 'ativo' as const
                    })),
                    ...(roleClients || [])
                        .filter(r => r.clientes)
                        .map(r => ({
                            id: (r.clientes as any).id,
                            nome: (r.clientes as any).nome,
                            slug: (r.clientes as any).slug || '',
                            status: 'ativo' as const
                        }))
                ];

                const uniqueClients = Array.from(new Map(allMyClients.map(c => [c.id, c])).values())
                    .sort((a, b) => a.nome.localeCompare(b.nome));

                setClientes(uniqueClients);
                setUserRole('gestor');

            } catch (error: any) {
                console.error("Erro ao carregar clientes:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserRoleAndClients();
    }, [user, canSeeAll]);

    if (loading) {
        return (
            <Card className="h-full loading-skeleton shadow-sm border-none">
                <CardHeader><CardTitle className="text-muted-foreground animate-pulse">Carregando seus clientes...</CardTitle></CardHeader>
            </Card>
        );
    }

    if (clientes.length === 0 && !loading) {
        return (
            <Card className="hover:shadow-md transition-shadow border-none shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Meus Clientes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                        <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
                        <div className="space-y-1">
                            <p className="font-medium text-muted-foreground">Nenhum cliente vinculado</p>
                            <p className="text-xs text-muted-foreground/60 max-w-[200px]">
                                Você não possui clientes atribuídos ao seu usuário.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="hover:shadow-md transition-shadow border-none shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        {userRole === 'admin' ? 'Todos os Clientes' : 'Meus Clientes'}
                    </CardTitle>
                    <Badge variant="secondary" className="font-semibold px-2 py-0.5 text-xs">
                        {clientes.length}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid gap-2 grid-cols-1">
                        {clientes.slice(0, 6).map((cliente) => (
                            <Button
                                key={cliente.id}
                                variant="ghost"
                                className="h-auto py-3 px-3 justify-start text-left group w-full hover:bg-primary/5 transition-all border border-transparent hover:border-primary/10"
                                onClick={() => navigate(`/painel/${cliente.id}`)}
                            >
                                <div className="flex flex-col items-start gap-1 w-full truncate">
                                    <span className="font-semibold truncate w-full group-hover:text-primary transition-colors text-sm">
                                        {cliente.nome}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                        <Activity className="h-2.5 w-2.5" />
                                        Ver detalhes do cliente
                                    </span>
                                </div>
                                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground/30 group-hover:text-primary transition-colors" />
                            </Button>
                        ))}
                    </div>

                    {clientes.length > 6 && (
                        <Button
                            variant="link"
                            className="w-full text-xs text-muted-foreground hover:text-primary p-0 h-auto font-normal"
                            onClick={() => navigate('/clientes')}
                        >
                            Ver todos os {clientes.length} clientes
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
