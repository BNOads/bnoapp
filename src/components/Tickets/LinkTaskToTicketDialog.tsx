import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLinkTaskToTicket } from "@/hooks/useTicketMutations";

interface LinkTaskToTicketDialogProps {
    ticketId: string;
    isOpen: boolean;
    onClose: () => void;
}

interface SearchTask {
    id: string;
    title: string;
    completed: boolean;
    priority: string | null;
    assignee: string | null;
    due_date: string | null;
}

export function LinkTaskToTicketDialog({ ticketId, isOpen, onClose }: LinkTaskToTicketDialogProps) {
    const [search, setSearch] = useState("");
    const [tasks, setTasks] = useState<SearchTask[]>([]);
    const [loading, setLoading] = useState(false);
    const linkTask = useLinkTaskToTicket();

    useEffect(() => {
        if (!isOpen) {
            setSearch("");
            setTasks([]);
            return;
        }

        const timer = setTimeout(async () => {
            if (search.length < 2) {
                setTasks([]);
                return;
            }

            setLoading(true);
            const { data } = await supabase
                .from("tasks")
                .select("id, title, completed, priority, assignee, due_date")
                .is("ticket_id", null)
                .ilike("title", `%${search}%`)
                .order("created_at", { ascending: false })
                .limit(20);

            setTasks(data || []);
            setLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [search, isOpen]);

    const handleLink = async (taskId: string) => {
        await linkTask.mutateAsync({ ticketId, taskId });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Vincular Tarefa ao Ticket</DialogTitle>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar tarefa pelo título..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                        autoFocus
                    />
                </div>

                <ScrollArea className="max-h-[300px]">
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {!loading && search.length >= 2 && tasks.length === 0 && (
                        <p className="text-sm text-center py-8 text-muted-foreground italic">
                            Nenhuma tarefa encontrada.
                        </p>
                    )}

                    {!loading && search.length < 2 && (
                        <p className="text-sm text-center py-8 text-muted-foreground italic">
                            Digite pelo menos 2 caracteres para buscar.
                        </p>
                    )}

                    <div className="space-y-1">
                        {tasks.map((task) => (
                            <button
                                key={task.id}
                                onClick={() => handleLink(task.id)}
                                disabled={linkTask.isPending}
                                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                            >
                                <div className="flex flex-col gap-1 min-w-0">
                                    <span className="text-sm font-medium truncate">{task.title}</span>
                                    <div className="flex items-center gap-2">
                                        {task.assignee && (
                                            <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                                        )}
                                        {task.due_date && (
                                            <span className="text-[10px] text-muted-foreground">{task.due_date}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {task.completed && (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    )}
                                    {task.priority && (
                                        <Badge variant="outline" className="text-[10px]">
                                            {task.priority}
                                        </Badge>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
