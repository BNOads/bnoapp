import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { TIPO_CLIENTE_LABELS, TIPO_FUNIL_LABELS } from "./ReferenciaCard";

export interface ReferenciaFilters {
    search: string;
    categoria: "todas" | "criativos" | "pagina";
    tipo_cliente: string;
    tipo_funil: string;
    tag: string;
}

const DEFAULT_FILTERS: ReferenciaFilters = {
    search: "",
    categoria: "todas",
    tipo_cliente: "todos",
    tipo_funil: "todos",
    tag: "",
};

interface ReferenciasFiltersProps {
    filters: ReferenciaFilters;
    onChange: (filters: ReferenciaFilters) => void;
    availableTags?: string[];
    showTipoCliente?: boolean;
    totalCount?: number;
    filteredCount?: number;
}

export function ReferenciasFilters({
    filters,
    onChange,
    availableTags = [],
    showTipoCliente = true,
    totalCount,
    filteredCount,
}: ReferenciasFiltersProps) {
    const hasActiveFilters =
        filters.search !== "" ||
        filters.categoria !== "todas" ||
        filters.tipo_cliente !== "todos" ||
        filters.tipo_funil !== "todos" ||
        filters.tag !== "";

    const clearAll = () => onChange(DEFAULT_FILTERS);

    return (
        <aside className="w-60 flex-shrink-0 space-y-5">
            {/* Header da sidebar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filtros
                </div>
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
                        onClick={clearAll}
                    >
                        <X className="w-3 h-3 mr-1" />
                        Limpar
                    </Button>
                )}
            </div>

            {/* Contagem */}
            {totalCount !== undefined && (
                <p className="text-xs text-muted-foreground">
                    {filteredCount} de {totalCount} referências
                </p>
            )}

            {/* Busca */}
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Buscar
                </Label>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Título..."
                        value={filters.search}
                        onChange={(e) => onChange({ ...filters, search: e.target.value })}
                        className="pl-8 h-8 text-sm"
                    />
                    {filters.search && (
                        <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => onChange({ ...filters, search: "" })}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Categoria
                </Label>
                <div className="flex flex-col gap-1">
                    {([["todas", "Todas"], ["criativos", "Criativos"], ["pagina", "Página"]] as const).map(
                        ([value, label]) => (
                            <button
                                key={value}
                                onClick={() => onChange({ ...filters, categoria: value })}
                                className={`text-left text-sm px-3 py-1.5 rounded-md transition-colors ${filters.categoria === value
                                        ? "bg-primary text-primary-foreground font-medium"
                                        : "hover:bg-muted text-foreground"
                                    }`}
                            >
                                {label}
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Tipo de Funil */}
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Etapa do Funil
                </Label>
                <Select
                    value={filters.tipo_funil}
                    onValueChange={(v) => onChange({ ...filters, tipo_funil: v })}
                >
                    <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {Object.entries(TIPO_FUNIL_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Tipo de Cliente */}
            {showTipoCliente && (
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Tipo de Cliente
                    </Label>
                    <Select
                        value={filters.tipo_cliente}
                        onValueChange={(v) => onChange({ ...filters, tipo_cliente: v })}
                    >
                        <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            {Object.entries(TIPO_CLIENTE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Tags */}
            {availableTags.length > 0 && (
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Tags
                    </Label>
                    <div className="flex flex-wrap gap-1">
                        {availableTags.map((tag) => (
                            <button
                                key={tag}
                                onClick={() =>
                                    onChange({ ...filters, tag: filters.tag === tag ? "" : tag })
                                }
                                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${filters.tag === tag
                                        ? "bg-primary text-primary-foreground border-primary font-medium"
                                        : "bg-muted border-border text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </aside>
    );
}

export { DEFAULT_FILTERS };
