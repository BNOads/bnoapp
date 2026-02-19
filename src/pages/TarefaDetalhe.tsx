import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TaskDetailDialog } from "@/components/tasks/details/TaskDetailDialog";

export default function TarefaDetalhe() {
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <TaskDetailDialog
            taskId={id || null}
            open={true}
            onOpenChange={(open) => {
                if (!open) {
                    navigate("/tarefas");
                }
            }}
        />
    );
}
