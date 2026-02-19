import React, { useState } from "react";
import { Subtask } from "@/types/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { useCreateSubtask, useToggleSubtaskComplete, useDeleteSubtask } from "@/hooks/useSubtasks";

interface SubtaskListProps {
    taskId: string;
    subtasks: Subtask[];
    parentSubtaskId?: string;
    level?: number;
}

export function SubtaskList({ taskId, subtasks, parentSubtaskId, level = 0 }: SubtaskListProps) {
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const { mutate: createSubtask, isPending: isCreating } = useCreateSubtask();
    const { mutate: toggleComplete } = useToggleSubtaskComplete();
    const { mutate: deleteSubtask } = useDeleteSubtask();

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        createSubtask(
            {
                task_id: taskId,
                title: newTaskTitle.trim(),
                parent_subtask_id: parentSubtaskId || null,
            },
            {
                onSuccess: () => {
                    setNewTaskTitle("");
                    setIsAdding(false);
                    if (parentSubtaskId) {
                        setExpanded(prev => ({ ...prev, [parentSubtaskId]: true }));
                    }
                },
            }
        );
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (level > 4) return null; // Max 5 levels of nesting

    return (
        <div className={`space-y-2 ${level > 0 ? "ml-6 mt-2 border-l pl-4" : ""}`}>
            {subtasks.map((subtask) => (
                <div key={subtask.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 group">
                        {subtask.subtasks && subtask.subtasks.length > 0 && (
                            <button onClick={() => toggleExpand(subtask.id)} className="p-1 hover:bg-muted rounded-md text-foreground/60 transition-colors">
                                {expanded[subtask.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        )}
                        {!(subtask.subtasks && subtask.subtasks.length > 0) && (
                            <div className="w-6" /> // spacer
                        )}

                        <Checkbox
                            checked={subtask.completed}
                            onCheckedChange={(checked) => toggleComplete({ id: subtask.id, completed: checked as boolean, taskId })}
                            className="mt-0.5"
                        />

                        <span className={`text-sm flex-1 ${subtask.completed ? "line-through text-muted-foreground" : ""}`}>
                            {subtask.title}
                        </span>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                            {level < 4 && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                    setExpanded(prev => ({ ...prev, [subtask.id]: true }));
                                    // Needs a more complex state to add child under specific parent
                                }}>
                                    <Plus className="w-3 h-3" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive/80 hover:text-destructive"
                                onClick={() => deleteSubtask({ id: subtask.id, taskId })}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>

                    {(expanded[subtask.id] || (subtask.subtasks && subtask.subtasks.length > 0)) && subtask.subtasks && (
                        <div className={expanded[subtask.id] !== false ? "block" : "hidden"}>
                            <SubtaskList
                                taskId={taskId}
                                subtasks={subtask.subtasks}
                                parentSubtaskId={subtask.id}
                                level={level + 1}
                            />
                        </div>
                    )}
                </div>
            ))}

            {isAdding ? (
                <form onSubmit={handleCreate} className="flex items-center gap-2 mt-2 ml-6">
                    <Input
                        autoFocus
                        size={1}
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Nova subtarefa..."
                        className="h-8 text-sm"
                        disabled={isCreating}
                    />
                    <Button type="submit" size="sm" className="h-8" disabled={isCreating || !newTaskTitle.trim()}>
                        Adicionar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setIsAdding(false)}>
                        Cancelar
                    </Button>
                </form>
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground text-sm ml-6 h-8 px-2 flex items-center gap-1 hover:text-foreground"
                    onClick={() => setIsAdding(true)}
                >
                    <Plus className="w-3 h-3" />
                    Adicionar Subtarefa
                </Button>
            )}
        </div>
    );
}
