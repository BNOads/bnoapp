import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Copy, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export function ResumoReferenciasCard() {
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleCopyLink = () => {
        const url = window.location.origin + "/referencias";
        navigator.clipboard.writeText(url);
        toast({
            title: "Copiado!",
            description: "Link da central de referências copiado.",
        });
    };

    const handleSearchReferences = () => {
        navigate("/referencias");
    };

    return (
        <div className="w-full flex items-center justify-between gap-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100 leading-none">Resumo e Referências</h4>
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/60 mt-1 truncate">
                        Consolide referências e gere resumos rápidos para os clientes.
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 shadow-sm"
                    onClick={handleCopyLink}
                >
                    <Copy className="h-4 w-4" />
                    <span className="text-xs font-medium">Pegar Link</span>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 shadow-sm"
                    onClick={handleSearchReferences}
                >
                    <Search className="h-4 w-4" />
                    <span className="text-xs font-medium">Pesquisar Refs</span>
                </Button>
            </div>
        </div>
    );
}
