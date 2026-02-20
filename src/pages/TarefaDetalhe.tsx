import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TaskDetailDialog } from "@/components/tasks/details/TaskDetailDialog";

export default function TarefaDetalhe() {
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <div className="h-full bg-background mt-4 sm:p-6 overflow-hidden">
            <TaskDetailDialog
                taskId={id || null}
                asPage={true}
            />
        </div>
    );
}
