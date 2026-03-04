import { ReferenciaItem, TIPO_CLIENTE_LABELS, TIPO_FUNIL_LABELS, TIPO_CLIENTE_COLORS, TIPO_FUNIL_COLORS } from "./ReferenciaCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Globe, ImageIcon, Eye, ExternalLink, Share2, Check, Edit2, Trash2, Tag, Lock, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ReferenciaInlineTags } from "./ReferenciaInlineTags";

interface ReferenciasListProps {
    referencias: ReferenciaItem[];
    availableTags: string[];
    onView?: (ref: ReferenciaItem) => void;
    onEdit?: (ref: ReferenciaItem) => void;
    onDelete?: (ref: ReferenciaItem) => void;
    canEdit?: boolean;
    emptyMessage?: string;
    emptySubMessage?: string;
    onTagsChange?: (referenciaId: string, newTags: string[]) => void;
}

export function ReferenciasList({
    referencias,
    availableTags,
    onView,
    onEdit,
    onDelete,
    canEdit = false,
    emptyMessage = "Nenhuma referência encontrada",
    emptySubMessage,
    onTagsChange
}: ReferenciasListProps) {
    const { toast } = useToast();
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>({ key: "created_at", direction: "desc" });

    const handleSort = (key: string) => {
        setSortConfig((current) => {
            if (current?.key === key) {
                if (current.direction === "asc") return { key, direction: "desc" };
                if (current.direction === "desc") return null;
            }
            return { key, direction: "asc" };
        });
    };

    const sortedReferencias = useMemo(() => {
        if (!sortConfig) return referencias;

        return [...referencias].sort((a, b) => {
            let valA: any = "";
            let valB: any = "";

            if (sortConfig.key === "titulo") {
                valA = a.titulo.toLowerCase();
                valB = b.titulo.toLowerCase();
            } else if (sortConfig.key === "categoria") {
                valA = a.categoria?.toLowerCase() || "";
                valB = b.categoria?.toLowerCase() || "";
            } else if (sortConfig.key === "created_at") {
                valA = new Date(a.created_at || 0).getTime();
                valB = new Date(b.created_at || 0).getTime();
            }

            if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
            if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [referencias, sortConfig]);

    const renderSortIcon = (key: string) => {
        if (sortConfig?.key !== key) return <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-50" />;
        return sortConfig.direction === "asc" ? (
            <ArrowUp className="w-3 h-3 inline-block ml-1" />
        ) : (
            <ArrowDown className="w-3 h-3 inline-block ml-1" />
        );
    };

    const handleCopy = async (ref: ReferenciaItem) => {
        const publicLink = ref.is_public && ref.public_slug
            ? `${window.location.origin}/r/${ref.public_slug}`
            : `${window.location.origin}/referencia/${ref.id}`;

        await navigator.clipboard.writeText(publicLink);
        setCopiedId(ref.id);
        toast({ title: "Link copiado!", duration: 2000 });
        setTimeout(() => setCopiedId(null), 2000);
    };

    const hasContent = (ref: ReferenciaItem) => {
        try {
            if (!ref.conteudo) return false;
            const parsed = typeof ref.conteudo === "string"
                ? JSON.parse(ref.conteudo)
                : ref.conteudo;
            return Array.isArray(parsed) && parsed.length > 0;
        } catch {
            return false;
        }
    };

    if (referencias.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-base font-medium text-foreground">{emptyMessage}</p>
                {emptySubMessage && (
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        {emptySubMessage}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[80px]">Capa</TableHead>
                        <TableHead
                            className="min-w-[200px] cursor-pointer hover:bg-muted/80 select-none transition-colors"
                            onClick={() => handleSort("titulo")}
                        >
                            Título / Detalhes {renderSortIcon("titulo")}
                        </TableHead>
                        <TableHead
                            className="w-[180px] cursor-pointer hover:bg-muted/80 select-none transition-colors"
                            onClick={() => handleSort("categoria")}
                        >
                            Categorização {renderSortIcon("categoria")}
                        </TableHead>
                        <TableHead
                            className="w-[120px] cursor-pointer hover:bg-muted/80 select-none transition-colors"
                            onClick={() => handleSort("created_at")}
                        >
                            Criado em {renderSortIcon("created_at")}
                        </TableHead>
                        <TableHead className="min-w-[250px]">Tags</TableHead>
                        <TableHead className="w-[160px] text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedReferencias.map((ref) => {
                        const isExternal = !!ref.link_url || (ref.links_externos && ref.links_externos.length > 0);
                        const externalUrl = ref.link_url ? ref.link_url : ref.links_externos?.[0]?.url ?? null;
                        const contentExists = hasContent(ref);

                        return (
                            <TableRow key={ref.id} className="group hover:bg-muted/30">
                                {/* Thumbnail */}
                                <TableCell>
                                    <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden border border-border/50 relative">
                                        {ref.thumbnail_url ? (
                                            <img
                                                src={ref.thumbnail_url}
                                                alt={ref.titulo}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="text-muted-foreground/50">
                                                {ref.categoria === "pagina" ? (
                                                    <Globe className="w-6 h-6" />
                                                ) : (
                                                    <ImageIcon className="w-6 h-6" />
                                                )}
                                            </div>
                                        )}

                                        {/* Public badge small overlay */}
                                        <div className="absolute top-1 right-1">
                                            {ref.is_public ? (
                                                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm" title="Público">
                                                    <Globe className="w-2.5 h-2.5 text-white" />
                                                </div>
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-slate-400 flex items-center justify-center shadow-sm" title="Privado">
                                                    <Lock className="w-2.5 h-2.5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>

                                {/* Title & Desc */}
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold text-sm leading-tight text-foreground line-clamp-1" title={ref.titulo}>
                                            {ref.titulo}
                                        </span>
                                        {ref.descricao ? (
                                            <span className="text-xs text-muted-foreground line-clamp-2" title={ref.descricao}>
                                                {ref.descricao}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic opacity-50">Sem descrição</span>
                                        )}
                                    </div>
                                </TableCell>

                                {/* Categorização (Tipo, Funil, etc) */}
                                <TableCell>
                                    <div className="flex flex-col gap-1.5 items-start">
                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize font-medium">
                                            {ref.categoria === "criativos" ? "Criativos" : "Página"}
                                        </Badge>

                                        {ref.tipo_cliente && (
                                            <span className={`inline-flex items-center justify-center whitespace-nowrap text-[10px] font-medium px-2 h-5 rounded-full border ${TIPO_CLIENTE_COLORS[ref.tipo_cliente] ?? "bg-muted text-foreground border-border"}`}>
                                                {TIPO_CLIENTE_LABELS[ref.tipo_cliente] ?? ref.tipo_cliente}
                                            </span>
                                        )}

                                        {ref.tipo_funil && (
                                            <span className={`inline-flex items-center justify-center whitespace-nowrap text-[10px] font-medium px-2 h-5 rounded-full border ${TIPO_FUNIL_COLORS[ref.tipo_funil] ?? "bg-muted text-foreground border-border"}`}>
                                                {TIPO_FUNIL_LABELS[ref.tipo_funil] ?? ref.tipo_funil}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>

                                {/* Data de Criação */}
                                <TableCell>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {ref.created_at ? format(new Date(ref.created_at), "dd/MM/yyyy") : "-"}
                                    </span>
                                </TableCell>

                                {/* Tags Editáveis */}
                                <TableCell>
                                    <ReferenciaInlineTags
                                        referencia={ref}
                                        availableTags={availableTags}
                                        onTagsChange={(newTags) => onTagsChange?.(ref.id, newTags)}
                                        disabled={!canEdit}
                                    />
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* View/Open Link */}
                                        {isExternal ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => externalUrl && window.open(externalUrl, "_blank")}
                                                title="Abrir Link Externo"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => onView?.(ref)}
                                                disabled={!contentExists}
                                                title="Visualizar"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        )}

                                        {/* Copy Link */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            onClick={() => handleCopy(ref)}
                                            title="Copiar link"
                                        >
                                            {copiedId === ref.id ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <Share2 className="w-4 h-4" />
                                            )}
                                        </Button>

                                        {/* Edit / Delete */}
                                        {canEdit && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => onEdit?.(ref)}
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => onDelete?.(ref)}
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
