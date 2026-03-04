import { Button } from "@/components/ui/button";
import { Search, Copy, FileText, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <Card className="border-amber-100 dark:border-amber-900/30 overflow-hidden">
            <CardHeader className="pb-3 px-4 pt-4 bg-amber-50/30 dark:bg-amber-950/10 border-b border-amber-50 dark:border-amber-900/20">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg font-bold text-amber-700 dark:text-amber-400">
                        <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/40">
                            <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span>Referências</span>
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 p-3 bg-amber-50/10 dark:bg-amber-950/5 pt-3">
                <div
                    onClick={handleSearchReferences}
                    className="flex flex-col p-3 rounded-xl border-2 bg-card hover:bg-muted/50 hover:border-amber-400 cursor-pointer transition-all shadow-sm group"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[15px] leading-tight text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            Buscar Referências
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors shrink-0" />
                    </div>
                </div>

                <div
                    onClick={handleCopyLink}
                    className="flex flex-col p-3 rounded-xl border-2 bg-card hover:bg-muted/50 hover:border-amber-400 cursor-pointer transition-all shadow-sm group"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[15px] leading-tight text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            Copiar Link Geral
                        </span>
                        <Copy className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors shrink-0" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
