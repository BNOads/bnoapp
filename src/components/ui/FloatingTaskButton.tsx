import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CreateTaskModal } from "@/components/tasks/modals/CreateTaskModal";
import { useDraftTasksStore, DraftTask } from "@/store/useDraftTasksStore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, User, Flag, Minus, PenLine } from "lucide-react";

function TaskPlusIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 10.5V12a9 9 0 1 1-5.04-8.06" />
            <path d="m9 12 2.25 2.5L21 4" />
            <path d="M19 19v4" />
            <path d="M17 21h4" />
        </svg>
    );
}

export function FloatingTaskButton() {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDraft, setSelectedDraft] = useState<DraftTask | undefined>();
    const { drafts, removeDraft } = useDraftTasksStore();

    const handleOpenNewTask = () => {
        setSelectedDraft(undefined);
        setModalOpen(true);
    };

    const handleOpenDraft = (draft: DraftTask) => {
        setSelectedDraft(draft);
        setModalOpen(true);
    };

    return (
        <div className="fixed bottom-[80px] right-6 z-50 flex flex-col items-end gap-2 group">
            {/* Draft list (shows on group hover) */}
            {drafts.length > 0 && (
                <div className="mb-2 hidden w-72 flex-col gap-2 opacity-0 transition-all duration-300 group-hover:flex group-hover:opacity-100 bg-background/95 backdrop-blur-sm border shadow-xl rounded-xl p-3">
                    <div className="flex items-center justify-between pb-2 border-b">
                        <span className="text-sm font-semibold text-foreground">Rascunhos</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{drafts.length} pendentes</span>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                        {drafts.map((draft) => (
                            <div
                                key={draft.id}
                                className="group/item flex flex-col gap-1.5 p-2 rounded-lg border bg-card hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer relative"
                                onClick={() => handleOpenDraft(draft)}
                            >
                                <span className="font-medium text-sm truncate pr-6">
                                    {draft.title || "Sem título"}
                                </span>

                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    {draft.assignee && (
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <span className="truncate max-w-[80px]">{draft.assignee}</span>
                                        </div>
                                    )}
                                    {draft.due_date && (
                                        <div className="flex items-center gap-1">
                                            <CalendarIcon className="h-3 w-3" />
                                            <span>{format(new Date(draft.due_date + 'T12:00:00'), "dd/MM", { locale: ptBR })}</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 p-1 bg-background rounded text-destructive hover:bg-destructive hover:text-white transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeDraft(draft.id);
                                    }}
                                    title="Descartar rascunho"
                                >
                                    <Minus className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Button
                onClick={handleOpenNewTask}
                className="relative h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-amber-500 hover:bg-amber-600 p-0 text-white"
                title="Nova Tarefa"
            >
                {drafts.length > 0 && (
                    <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
                        {drafts.length}
                    </div>
                )}
                <TaskPlusIcon className="h-6 w-6" />
            </Button>

            <CreateTaskModal
                open={modalOpen}
                onOpenChange={(isOpen) => {
                    setModalOpen(isOpen);
                    if (!isOpen) setSelectedDraft(undefined);
                }}
                draftData={selectedDraft}
            />
        </div>
    );
}
