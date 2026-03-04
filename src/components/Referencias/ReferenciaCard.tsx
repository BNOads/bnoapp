import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Eye,
    Edit2,
    Trash2,
    Share2,
    ExternalLink,
    FileText,
    ImageIcon,
    Globe,
    Lock,
    Copy,
    Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface ReferenciaItem {
    id: string;
    titulo: string;
    categoria: "criativos" | "pagina" | string;
    tipo_cliente?: string | null;
    tipo_funil?: string | null;
    tags?: string[] | null;
    thumbnail_url?: string | null;
    descricao?: string | null;
    is_public?: boolean | null;
    public_slug?: string | null;
    link_url?: string | null;
    links_externos?: Array<{ titulo: string; url: string }> | null;
    conteudo?: string | null;
    created_at: string;
    is_template?: boolean;
}

export const TIPO_CLIENTE_LABELS: Record<string, string> = {
    ecommerce: "E-commerce",
    local: "Business Local",
    infoproduto: "Infoproduto",
    servicos: "Serviços",
    saude: "Saúde",
    educacao: "Educação",
    moda: "Moda & Lifestyle",
    tech: "Tech & SaaS",
    imobiliario: "Imobiliário",
    restaurante: "Restaurante",
};

export const TIPO_FUNIL_LABELS: Record<string, string> = {
    topo: "Topo de Funil",
    meio: "Meio de Funil",
    fundo: "Fundo de Funil",
    retencao: "Retenção",
    reativacao: "Reativação",
};

export const TIPO_FUNIL_COLORS: Record<string, string> = {
    topo: "bg-blue-100 text-blue-700 border-blue-200",
    meio: "bg-amber-100 text-amber-700 border-amber-200",
    fundo: "bg-green-100 text-green-700 border-green-200",
    retencao: "bg-purple-100 text-purple-700 border-purple-200",
    reativacao: "bg-rose-100 text-rose-700 border-rose-200",
};

export const TIPO_CLIENTE_COLORS: Record<string, string> = {
    ecommerce: "bg-orange-100 text-orange-700 border-orange-200",
    local: "bg-teal-100 text-teal-700 border-teal-200",
    infoproduto: "bg-violet-100 text-violet-700 border-violet-200",
    servicos: "bg-sky-100 text-sky-700 border-sky-200",
    saude: "bg-emerald-100 text-emerald-700 border-emerald-200",
    educacao: "bg-indigo-100 text-indigo-700 border-indigo-200",
    moda: "bg-pink-100 text-pink-700 border-pink-200",
    tech: "bg-cyan-100 text-cyan-700 border-cyan-200",
    imobiliario: "bg-stone-100 text-stone-700 border-stone-200",
    restaurante: "bg-red-100 text-red-700 border-red-200",
};

interface ReferenciaCardProps {
    referencia: ReferenciaItem;
    onView?: (ref: ReferenciaItem) => void;
    onEdit?: (ref: ReferenciaItem) => void;
    onDelete?: (ref: ReferenciaItem) => void;
    canEdit?: boolean;
}

export function ReferenciaCard({
    referencia,
    onView,
    onEdit,
    onDelete,
    canEdit = false,
}: ReferenciaCardProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const isExternal =
        !!referencia.link_url ||
        (referencia.links_externos && referencia.links_externos.length > 0);

    const externalUrl = referencia.link_url
        ? referencia.link_url
        : referencia.links_externos?.[0]?.url ?? null;

    const publicLink = referencia.is_public && referencia.public_slug
        ? `${window.location.origin}/r/${referencia.public_slug}`
        : `${window.location.origin}/referencia/${referencia.id}`;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(publicLink);
        setCopied(true);
        toast({ title: "Link copiado!", duration: 2000 });
        setTimeout(() => setCopied(false), 2000);
    };

    const hasContent = (() => {
        try {
            if (!referencia.conteudo) return false;
            const parsed = typeof referencia.conteudo === "string"
                ? JSON.parse(referencia.conteudo)
                : referencia.conteudo;
            return Array.isArray(parsed) && parsed.length > 0;
        } catch {
            return false;
        }
    })();

    return (
        <div className="group relative flex flex-col bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden">
            {/* Thumbnail / Placeholder */}
            <div className="relative h-36 bg-gradient-to-br from-muted/60 to-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {referencia.thumbnail_url ? (
                    <img
                        src={referencia.thumbnail_url}
                        alt={referencia.titulo}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                        {referencia.categoria === "pagina" ? (
                            <Globe className="w-10 h-10" />
                        ) : (
                            <ImageIcon className="w-10 h-10" />
                        )}
                    </div>
                )}

                {/* Badges de tipo no topo */}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {referencia.tipo_funil && (
                        <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TIPO_FUNIL_COLORS[referencia.tipo_funil] ?? "bg-muted text-foreground border-border"
                                }`}
                        >
                            {TIPO_FUNIL_LABELS[referencia.tipo_funil] ?? referencia.tipo_funil}
                        </span>
                    )}
                </div>

                {/* Lock/Globe badge */}
                <div className="absolute top-2 right-2">
                    {referencia.is_public ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                            <Globe className="w-3 h-3" />
                            Público
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                            <Lock className="w-3 h-3" />
                            Privado
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 p-4 gap-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
                        {referencia.titulo}
                    </h3>
                </div>

                {referencia.descricao && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        {referencia.descricao}
                    </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-1 mt-auto pt-2">
                    <Badge
                        variant="outline"
                        className="text-[10px] h-5 px-1.5 capitalize"
                    >
                        {referencia.categoria === "criativos" ? "Criativos" : "Página"}
                    </Badge>

                    {referencia.tipo_cliente && (
                        <span
                            className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0 h-5 rounded-full border ${TIPO_CLIENTE_COLORS[referencia.tipo_cliente] ?? "bg-muted text-foreground border-border"
                                }`}
                        >
                            {TIPO_CLIENTE_LABELS[referencia.tipo_cliente] ?? referencia.tipo_cliente}
                        </span>
                    )}

                    {referencia.tags?.slice(0, 2).map((tag) => (
                        <span
                            key={tag}
                            className="inline-flex items-center text-[10px] font-medium px-1.5 py-0 h-5 rounded-full bg-secondary text-secondary-foreground"
                        >
                            #{tag}
                        </span>
                    ))}
                    {(referencia.tags?.length ?? 0) > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                            +{(referencia.tags?.length ?? 0) - 2}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions — aparece ao hover */}
            <div className="flex items-center justify-between gap-1 px-4 py-2 border-t border-border/60 bg-muted/30">
                {/* Link externo ou Visualizar */}
                {isExternal ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => externalUrl && window.open(externalUrl, "_blank")}
                    >
                        <ExternalLink className="w-3 h-3" />
                        Abrir
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => onView?.(referencia)}
                        disabled={!hasContent}
                    >
                        <Eye className="w-3 h-3" />
                        Ver
                    </Button>
                )}

                <div className="flex items-center gap-0.5">
                    {/* Copiar link */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                        onClick={handleCopy}
                        title="Copiar link"
                    >
                        {copied ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                            <Share2 className="w-3.5 h-3.5" />
                        )}
                    </Button>

                    {canEdit && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => onEdit?.(referencia)}
                                title="Editar"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => onDelete?.(referencia)}
                                title="Excluir"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
