import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

Deno.serve(async (req: Request) => {
    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const today = new Date().toISOString().split("T")[0];

        // 1. Busca todas as tarefas completadas, com recorrência válida, e devido no passado/hoje
        const { data: tasks, error } = await supabaseClient
            .from("tasks")
            .select("*")
            .eq("completed", true)
            .not("recurrence", "is", null)
            .neq("recurrence", "none")
            .lte("due_date", today);

        if (error) throw error;

        if (!tasks || tasks.length === 0) {
            return new Response(JSON.stringify({ message: "Nenhuma tarefa para processar" }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        const processedTasks = [];

        for (const task of tasks) {
            if (!task.due_date) continue;

            const dueDateTimestamp = new Date(`${task.due_date}T00:00:00`);
            let nextDate = new Date(dueDateTimestamp);

            switch (task.recurrence) {
                case "daily":
                    nextDate.setDate(nextDate.getDate() + 1);
                    break;
                case "weekly":
                    nextDate.setDate(nextDate.getDate() + 7);
                    break;
                case "biweekly":
                    nextDate.setDate(nextDate.getDate() + 14);
                    break;
                case "monthly":
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    break;
                case "semiannual":
                    nextDate.setMonth(nextDate.getMonth() + 6);
                    break;
                case "yearly":
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                    break;
            }

            // Aplica lógica de pular finais de semana (sábado -> segunda, domingo -> segunda)
            const dayOfWeek = nextDate.getDay();
            if (dayOfWeek === 6) { // Sábado
                nextDate.setDate(nextDate.getDate() + 2);
            } else if (dayOfWeek === 0) { // Domingo
                nextDate.setDate(nextDate.getDate() + 1);
            }

            const nextDateString = nextDate.toISOString().split("T")[0];

            // Verifica limite de data final
            if (task.recurrence_end_date && nextDateString > task.recurrence_end_date) {
                continue;
            }

            // Verifica se já existe para evitar duplicatas (mesmo titulo, responsavel e data)
            let query = supabaseClient
                .from("tasks")
                .select("id")
                .eq("title", task.title)
                .eq("due_date", nextDateString);

            if (task.assignee) {
                query = query.eq("assignee", task.assignee);
            } else {
                query = query.is("assignee", null);
            }

            const { data: existing } = await query.maybeSingle();

            if (existing) continue;

            // Cria nova instância
            const newTask = {
                title: task.title,
                description: task.description,
                priority: task.priority,
                category: task.category,
                assignee: task.assignee,
                assigned_to_id: task.assigned_to_id,
                due_date: nextDateString,
                due_time: task.due_time,
                recurrence: task.recurrence,
                recurrence_end_date: task.recurrence_end_date,
                parent_task_id: task.parent_task_id || task.id,
                is_recurring_instance: true,
                completed: false,
                created_by_id: task.created_by_id, // Preserve owner
            };

            const { data: createdTask, error: createError } = await supabaseClient
                .from("tasks")
                .insert(newTask)
                .select()
                .single();

            if (createError) {
                console.error("Error creating task", createError);
                continue;
            }

            // Add task_history entry
            await supabaseClient.from("task_history").insert({
                task_id: createdTask.id,
                action: "created",
                changed_by: "Sistema (Recorrência automática)",
            });

            processedTasks.push(createdTask.id);
        }

        return new Response(JSON.stringify({ message: "Sucesso", processed: processedTasks.length, processedTasks }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
