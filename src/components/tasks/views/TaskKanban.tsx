import React, { useState, useEffect } from "react";
import { Task } from "@/types/tasks";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToggleTaskComplete, useUpdateTask } from "@/hooks/useTaskMutations";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    useDroppable,
    useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, MessageSquare, Clock, Building2, FileText } from "lucide-react";
import { PRIORITY_LABELS } from "@/types/tasks";
import { isOverdue } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";

interface TaskKanbanProps {
    tasks: Task[];
    onTaskClick: (taskId: string) => void;
}

const COLUMNS = [
    { id: "baixa", title: PRIORITY_LABELS.baixa, headerColor: "bg-blue-500/10 text-blue-700 border-blue-200 dark:border-blue-800 dark:text-blue-400", dropColor: "border-blue-300 bg-blue-50/60 dark:bg-blue-950/20" },
    { id: "media", title: PRIORITY_LABELS.media, headerColor: "bg-amber-500/10 text-amber-700 border-amber-200 dark:border-amber-800 dark:text-amber-400", dropColor: "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20" },
    { id: "alta", title: PRIORITY_LABELS.alta, headerColor: "bg-rose-500/10 text-rose-700 border-rose-200 dark:border-rose-800 dark:text-rose-400", dropColor: "border-rose-300 bg-rose-50/60 dark:bg-rose-950/20" },
    { id: "completed", title: "Concluídas", headerColor: "bg-green-500/10 text-green-700 border-green-200 dark:border-green-800 dark:text-green-400", dropColor: "border-green-300 bg-green-50/60 dark:bg-green-950/20" },
];

// ── Draggable Card ──────────────────────────────────────────────────────────

function DraggableCard({
    task,
    onTaskClick,
    clientes,
    isDragging,
}: {
    task: Task;
    onTaskClick: (id: string) => void;
    clientes: { id: string; nome: string }[];
    isDragging?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
    const { mutate: toggleComplete } = useToggleTaskComplete();

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.35 : 1,
        touchAction: "none",
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`p-3 rounded-lg border bg-card hover:border-primary/50 hover:shadow-sm cursor-grab active:cursor-grabbing mb-2.5 select-none transition-shadow ${task.completed ? "opacity-60" : ""
                } ${isDragging ? "shadow-none" : "shadow-sm"}`}
        >
            <div className="flex items-start gap-2 mb-2">
                <div onClick={(e) => { e.stopPropagation(); }}>
                    <Checkbox
                        checked={task.completed}
                        onCheckedChange={(c) => toggleComplete({ id: task.id, completed: c as boolean })}
                        className={`mt-1 w-4 h-4 transition-all rounded-[3px] ${task.completed
                                ? "border-emerald-500 bg-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                : task.priority === "alta"
                                    ? "border-rose-500"
                                    : task.priority === "media"
                                        ? "border-amber-500"
                                        : "border-blue-500"
                            }`}
                    />
                </div>
                <span
                    className={`text-sm font-medium leading-tight flex-1 cursor-pointer ${task.completed ? "line-through text-muted-foreground" : ""}`}
                    onClick={() => onTaskClick(task.id)}
                >
                    {task.title}
                    {(task.reschedule_count ?? 0) > 3 && (
                        <Badge className="ml-2 bg-purple-600 text-white text-[9px] h-3.5 px-1 py-0 inline-flex items-center align-middle relative -top-[1px]">
                            +Reagendada
                        </Badge>
                    )}
                </span>
            </div>

            {task.cliente_id && (
                <div className="mb-2 ml-6">
                    <Badge variant="outline" className="text-[10px] h-4 px-1 gap-1 font-normal border-primary/20 text-primary/80">
                        <Building2 className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[120px]">
                            {clientes.find((c) => c.id === task.cliente_id)?.nome || "Cliente"}
                        </span>
                    </Badge>
                </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                {task.assignee ? (
                    <span className="flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            {task.assignee.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate max-w-[80px]">{task.assignee}</span>
                    </span>
                ) : (
                    <span className="text-muted-foreground/60 italic text-[11px]">Não atribuído</span>
                )}
                <div className="flex gap-2">
                    {task.description?.trim() && (
                        <span title="Possui descrição"><FileText className="w-3.5 h-3.5" /></span>
                    )}
                    {(task.task_comments?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {task.task_comments!.length}
                        </span>
                    )}
                    {(task.time_tracked || 0) > 0 && (
                        <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {Math.floor((task.time_tracked || 0) / 3600)}:
                            {Math.floor(((task.time_tracked || 0) % 3600) / 60).toString().padStart(2, "0")}
                        </span>
                    )}
                    {task.due_date && (
                        <span className={`flex items-center gap-1 ${isOverdue(task.due_date, false) ? "text-destructive font-medium" : ""}`}>
                            <CalendarIcon className="w-3.5 h-3.5" />
                            {format(new Date(`${task.due_date}T00:00:00`), "dd/MMM", { locale: ptBR })}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Droppable Column ────────────────────────────────────────────────────────

function DroppableColumn({
    col,
    tasks,
    onTaskClick,
    clientes,
    activeId,
    overColumnId,
}: {
    col: (typeof COLUMNS)[number];
    tasks: Task[];
    onTaskClick: (id: string) => void;
    clientes: { id: string; nome: string }[];
    activeId: string | null;
    overColumnId: string | null;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: col.id });
    const isHighlighted = isOver || overColumnId === col.id;

    return (
        <div className="flex-shrink-0 w-80 rounded-xl flex flex-col bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden border border-transparent transition-colors">
            {/* Header */}
            <div className={`p-3 font-medium text-sm flex items-center justify-between border-b ${col.headerColor}`}>
                {col.title}
                <Badge variant="secondary" className="bg-white/70 dark:bg-slate-700/50 dark:text-slate-200 font-semibold">
                    {tasks.length}
                </Badge>
            </div>

            {/* Drop Zone */}
            <div
                ref={setNodeRef}
                className={`flex-1 p-3 overflow-y-auto min-h-[120px] transition-colors rounded-b-xl ${isHighlighted ? `${col.dropColor} border-2 border-dashed` : ""
                    }`}
            >
                {tasks.map((task) => (
                    <DraggableCard
                        key={task.id}
                        task={task}
                        onTaskClick={onTaskClick}
                        clientes={clientes}
                        isDragging={activeId === task.id}
                    />
                ))}

                {tasks.length === 0 && !isHighlighted && (
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg h-24 flex items-center justify-center text-slate-400 text-sm">
                        Arraste para cá
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function TaskKanban({ tasks, onTaskClick }: TaskKanbanProps) {
    const { mutate: toggleComplete } = useToggleTaskComplete();
    const { mutate: updateTask } = useUpdateTask();
    const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overColumnId, setOverColumnId] = useState<string | null>(null);

    useEffect(() => {
        supabase.from("clientes").select("id, nome").eq("is_active", true).then(({ data }) => {
            if (data) setClientes(data);
        });
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor)
    );

    const getTasksByColumn = (colId: string) => {
        if (colId === "completed") return tasks.filter((t) => t.completed);
        return tasks.filter((t) => !t.completed && (t.priority === colId || (!t.priority && colId === "media")));
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const overId = event.over?.id as string | null;
        if (overId && COLUMNS.some((c) => c.id === overId)) {
            setOverColumnId(overId);
        } else {
            setOverColumnId(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setOverColumnId(null);
        if (!over) return;

        const taskId = active.id as string;
        const overId = over.id as string;
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        // The over target is always a column id (droppable)
        const targetColumn = COLUMNS.find((c) => c.id === overId);
        if (!targetColumn) return;

        if (overId === "completed" && !task.completed) {
            toggleComplete({ id: taskId, completed: true });
        } else if (task.completed && overId !== "completed") {
            updateTask({ id: taskId, updates: { priority: overId as "alta" | "media" | "baixa", completed: false, completed_at: null } });
        } else if (!task.completed && overId !== "completed" && task.priority !== overId) {
            updateTask({ id: taskId, updates: { priority: overId as "alta" | "media" | "baixa" } });
        }
    };

    const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 h-full overflow-x-auto pb-4 pt-2 px-2">
                {COLUMNS.map((col) => (
                    <DroppableColumn
                        key={col.id}
                        col={col}
                        tasks={getTasksByColumn(col.id)}
                        onTaskClick={onTaskClick}
                        clientes={clientes}
                        activeId={activeId}
                        overColumnId={overColumnId}
                    />
                ))}
            </div>

            {/* Drag Overlay — floating card that follows the cursor */}
            <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
                {activeTask ? (
                    <div className="p-3 rounded-lg border bg-card shadow-2xl ring-2 ring-primary/30 opacity-95 w-80 cursor-grabbing rotate-1">
                        <span className="text-sm font-medium leading-tight">{activeTask.title}</span>
                        {activeTask.assignee && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                    {activeTask.assignee.charAt(0).toUpperCase()}
                                </span>
                                {activeTask.assignee}
                            </div>
                        )}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
