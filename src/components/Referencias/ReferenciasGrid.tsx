import { ReferenciaCard, ReferenciaItem } from "./ReferenciaCard";
import { FileText } from "lucide-react";

interface ReferenciasGridProps {
    referencias: ReferenciaItem[];
    onView?: (ref: ReferenciaItem) => void;
    onEdit?: (ref: ReferenciaItem) => void;
    onDelete?: (ref: ReferenciaItem) => void;
    canEdit?: boolean;
    emptyMessage?: string;
    emptySubMessage?: string;
}

export function ReferenciasGrid({
    referencias,
    onView,
    onEdit,
    onDelete,
    canEdit = false,
    emptyMessage = "Nenhuma referência encontrada",
    emptySubMessage,
}: ReferenciasGridProps) {
    if (referencias.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {referencias.map((ref) => (
                <ReferenciaCard
                    key={ref.id}
                    referencia={ref}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    canEdit={canEdit}
                />
            ))}
        </div>
    );
}
