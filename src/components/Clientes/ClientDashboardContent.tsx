
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, DollarSign, Link2, FileText, Video, Share2, MessageCircle, Star, Edit2, ArrowLeft } from "lucide-react";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary"; // I'll check if this exists or I need to move it
import { LancamentoCard } from "@/components/Lancamentos/LancamentoCard";
import { OrcamentoPorFunil } from "@/components/Clientes/OrcamentoPorFunil";
import { LinksImportantesEnhanced } from "@/components/Clientes/LinksImportantesEnhanced";
import { TestesClientePanel } from "@/components/Clientes/TestesClientePanel";
import { TarefasListEnhanced } from "@/components/Clientes/TarefasListEnhanced";
import { ChecklistCriativosView } from "@/components/Clientes/ChecklistCriativos";
import { DiarioBordo } from "@/components/Clientes/DiarioBordo";
import { GravacoesReunioes } from "@/components/Clientes/GravacoesReunioes";
import { MensagemSemanal } from "@/components/Clientes/MensagemSemanal";
import { HistoricoMensagensCliente } from "@/components/Clientes/HistoricoMensagensCliente";
import { NPSPopup } from "@/components/NPS/NPSPopup";
import { MetaAdsDashboard } from "@/components/Clientes/MetaAdsDashboard";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";

// Move SectionErrorBoundary here or import it. usage in PainelCliente was inline class. 
// I will define it here or export it from a separate file. 
// Since I can't easily move it to a separate file without an extra step, 
// I'll define it locally in this file for now or assume I can create a new file for it.
// I'll create a new file for ErrorBoundary first to be clean.

interface ClientDashboardContentProps {
    cliente: any;
    lancamentosAtivos: any[];
    isAuthenticated: boolean;
    canCreateContent: boolean;
    currentUser: any;
    currentColaboradorId: string | null;
    onEditClient: () => void;
    onShare: () => void;
    onNavigateBack: () => void;
}

export const ClientDashboardContent = ({
    cliente,
    lancamentosAtivos,
    isAuthenticated,
    canCreateContent,
    currentUser,
    currentColaboradorId,
    onEditClient,
    onShare,
    onNavigateBack
}: ClientDashboardContentProps) => {
    const { toast } = useToast(); // If needed for local interactions

    return (
        <>
            <Helmet>
                <title>{`${cliente.nome} - Painel do Cliente | BNOads`}</title>
                {/* Meta tags omitted for brevity, logic remains in parent or here if preferred */}
            </Helmet>

            {!isAuthenticated && <NPSPopup clienteId={cliente.id} clienteNome={cliente.nome} />}

            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
                <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                        <div className="flex-1">
                            <div className="flex items-start gap-2 sm:gap-4 mb-4">
                                {isAuthenticated && <Button variant="ghost" onClick={onNavigateBack} className="p-2 flex-shrink-0">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>}
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">
                                        {cliente.nome}
                                    </h1>
                                </div>
                            </div>
                        </div>

                        <div className="flex-shrink-0 flex gap-2">
                            {!isAuthenticated && (
                                <Button variant="default" size="sm" className="flex items-center gap-2">
                                    <Star className="h-4 w-4" />
                                    <span>Avaliar</span>
                                </Button>
                            )}

                            {isAuthenticated && canCreateContent && (
                                <Button variant="outline" size="sm" onClick={onEditClient} className="flex items-center gap-2">
                                    <Edit2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">Editar Cliente</span>
                                </Button>
                            )}

                            <Button variant="outline" size="sm" onClick={onShare} className="flex items-center gap-2">
                                <Share2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Compartilhar</span>
                            </Button>

                            {cliente.whatsapp_grupo_url && (
                                <Button asChild size="sm" className="w-full sm:w-auto">
                                    <a href={cliente.whatsapp_grupo_url} target="_blank" rel="noopener noreferrer">
                                        <MessageCircle className="h-4 w-4 mr-2" />
                                        <span className="hidden sm:inline">Grupo WhatsApp</span>
                                        <span className="sm:hidden">WhatsApp</span>
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-7xl">
                <div className="space-y-4 sm:space-y-6 lg:space-y-8">

                    {/* Lançamentos Ativos */}
                    {lancamentosAtivos.length > 0 && (
                        <section className="space-y-3 sm:space-y-4 animate-in fade-in-50 duration-500">
                            <div className="flex items-center gap-2 px-1">
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <Rocket className="h-5 w-5 sm:h-6 sm:w-6" />
                                    </div>
                                    <h2 className="text-lg sm:text-x1 lg:text-2xl font-bold">
                                        Lançamentos Ativos
                                    </h2>
                                </div>
                                <Badge variant="secondary" className="text-xs font-semibold">
                                    {lancamentosAtivos.length} {lancamentosAtivos.length === 1 ? 'Ativo' : 'Ativos'}
                                </Badge>
                            </div>
                            <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
                                {lancamentosAtivos.map(lanc => (
                                    <LancamentoCard key={lanc.id} lancamento={lanc} compact={false} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* New Meta Ads Dashboard Section */}
                    <section className="space-y-4">
                        {/* We don't define ErrorBoundary here yet, unless imported */}
                        {/* Check ClientMetaSettings if visible? Component handles it. */}
                        <MetaAdsDashboard clientId={cliente.id} isPublicView={!isAuthenticated} />
                    </section>

                    {/* Orçamento por Funil */}
                    <section className="space-y-4 flex flex-col h-full min-w-0">
                        <h2 className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-2 px-1">
                            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mx-0" />
                            <span className="truncate">Orçamento por Funil</span>
                        </h2>
                        <div className="w-full overflow-hidden">
                            <OrcamentoPorFunil clienteId={cliente.id} isPublicView={!isAuthenticated} showGestorValues={false} />
                        </div>
                    </section>

                    {/* Links e Tarefas */}
                    <div className="space-y-4 sm:space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 xl:gap-6 2xl:gap-8">
                        <section className="space-y-3 sm:space-y-4 min-w-0">
                            <h2 className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-2 px-1">
                                <Link2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                <span className="truncate">Links Importantes</span>
                            </h2>
                            <div className="w-full overflow-hidden">
                                <LinksImportantesEnhanced clienteId={cliente.id} isPublicView={!isAuthenticated} />
                            </div>

                            <div className="mt-6 lg:mt-8">
                                <TestesClientePanel
                                    clienteId={cliente.id}
                                    clienteNome={cliente.nome}
                                    isAuthenticated={isAuthenticated}
                                    canCreateContent={canCreateContent}
                                    currentUserId={currentUser?.id || null}
                                    currentColaboradorId={currentColaboradorId}
                                />
                            </div>
                        </section>

                        <section className="space-y-3 sm:space-y-4 min-w-0">
                            <h2 className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-2 px-1">
                                <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                <span className="truncate">Tarefas</span>
                            </h2>
                            <div className="w-full overflow-hidden">
                                <TarefasListEnhanced clienteId={cliente.id} tipo="cliente" isPublicView={!isAuthenticated} />
                            </div>

                            <div className="mt-6">
                                <ChecklistCriativosView clienteId={cliente.id} isPublicView={!isAuthenticated} />
                            </div>

                            <div className="mt-6">
                                <DiarioBordo clienteId={cliente.id} showLancamentoSelector={true} />
                            </div>
                        </section>
                    </div>

                    {/* Gravações */}
                    <section className="space-y-3 sm:space-y-4">
                        <h2 className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-2 px-1">
                            <Video className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                            <span className="truncate">Gravações e Reuniões</span>
                        </h2>
                        <div className="w-full overflow-hidden">
                            <GravacoesReunioes clienteId={cliente.id} isPublicView={!isAuthenticated} />
                        </div>
                    </section>

                    {/* Mensagens */}
                    <section className="space-y-3 sm:space-y-4">
                        <div className="w-full overflow-hidden space-y-4">
                            {isAuthenticated && (
                                <MensagemSemanal clienteId={cliente.id} gestorId={cliente.primary_gestor_user_id} csId={cliente.cs_id} />
                            )}
                            <HistoricoMensagensCliente clienteId={cliente.id} clienteNome={cliente.nome} isPublicView={!isAuthenticated} />
                        </div>
                    </section>

                </div>
            </div>
        </>
    );
};
