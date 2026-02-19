import React, { useState } from "react";
import { TaskComment } from "@/types/tasks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateComment, useDeleteComment } from "@/hooks/useTaskComments";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface CommentSectionProps {
    taskId: string;
    comments: TaskComment[];
}

export function CommentSection({ taskId, comments }: CommentSectionProps) {
    const [newComment, setNewComment] = useState("");
    const { userData: currentUser } = useCurrentUser();

    const { mutate: addComment, isPending } = useCreateComment();
    const { mutate: deleteComment } = useDeleteComment();

    const handleAddComment = () => {
        if (!newComment.trim() || !currentUser) return;

        addComment({
            task_id: taskId,
            author: currentUser.nome || currentUser.email || "Usuário",
            content: newComment.trim(),
            created_by_id: currentUser.id,
        }, {
            onSuccess: () => setNewComment(""),
        });
    };

    return (
        <div className="space-y-4">
            <h3 className="font-medium text-sm text-foreground/80">Comentários</h3>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 group relative">
                        <Avatar className="w-8 h-8">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${comment.author}`} />
                            <AvatarFallback>{comment.author?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{comment.author}</span>
                                <span className="text-xs text-muted-foreground">
                                    {format(new Date(comment.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                                </span>
                            </div>

                            <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap">
                                {comment.content}
                            </div>
                        </div>

                        {(currentUser?.id === comment.created_by_id || currentUser?.role === 'admin') && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive/80 hover:text-destructive transition-opacity"
                                onClick={() => deleteComment({ id: comment.id, taskId })}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                ))}

                {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum comentário ainda.
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
                <Textarea
                    placeholder="Adicione um comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="resize-none min-h-[80px]"
                    disabled={isPending}
                />
                <div className="flex justify-end">
                    <Button
                        size="sm"
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || isPending || !currentUser}
                    >
                        Comentar
                    </Button>
                </div>
            </div>
        </div>
    );
}
