import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

Deno.serve(async (req: Request) => {
    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const today = new Date().toISOString().split("T")[0];

        function getNthWeekdayOfMonth(year: number, month: number, weekPos: string, dayOfWeek: number): Date | null {
            if (weekPos === "last") {
                const lastDay = new Date(year, month + 1, 0); // last day of month
                const diff = (lastDay.getDay() - dayOfWeek + 7) % 7;
                const result = new Date(year, month, lastDay.getDate() - diff);
                return result.getMonth() === month ? result : null;
            }
            const n = parseInt(weekPos, 10);
            const firstDay = new Date(year, month, 1);
            const firstOccurrence = (dayOfWeek - firstDay.getDay() + 7) % 7;
            const date = 1 + firstOccurrence + (n - 1) * 7;
            const result = new Date(year, month, date);
            return result.getMonth() === month ? result : null;
        }

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
            let incremented = false;

            if (task.recurrence.startsWith("monthly_dow_")) {
                const parts = task.recurrence.split("_");
                const weekPos = parts[2]; // "1","2","3","4","last"
                const targetDay = parseInt(parts[3] || "1", 10); // 0=Sun…6=Sat

                nextDate.setMonth(nextDate.getMonth() + 1);
                let expected = getNthWeekdayOfMonth(nextDate.getFullYear(), nextDate.getMonth(), weekPos, targetDay);

                while (!expected) {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    expected = getNthWeekdayOfMonth(nextDate.getFullYear(), nextDate.getMonth(), weekPos, targetDay);
                }
                nextDate = expected;
                incremented = true;
            } else if (task.recurrence.startsWith("custom_weekly_")) {
                const daysStr = task.recurrence.replace("custom_weekly_", "");
                const targetDays = daysStr.split(",").map(Number);
                if (targetDays.length > 0) {
                    const currentDayOfWeek = nextDate.getDay(); // 0 = Dom, 6 = Sáb
                    targetDays.sort((a, b) => a - b);

                    let daysToAdd = -1;
                    for (const d of targetDays) {
                        if (d > currentDayOfWeek) {
                            daysToAdd = d - currentDayOfWeek;
                            break;
                        }
                    }

                    if (daysToAdd === -1) {
                        // Vai para o primeiro dia selecionado na próxima semana
                        daysToAdd = (7 - currentDayOfWeek) + targetDays[0];
                    }

                    nextDate.setDate(nextDate.getDate() + daysToAdd);
                    incremented = true;
                }
            } else if (task.recurrence.startsWith("custom_")) {
                const parts = task.recurrence.split("_");
                if (parts.length >= 3) {
                    const interval = parts[1]; // day, week, month, year
                    const amount = parseInt(parts[2] || "1", 10);
                    const daysStr = parts[3];

                    if (interval === "day") {
                        nextDate.setDate(nextDate.getDate() + amount);
                    } else if (interval === "month") {
                        nextDate.setMonth(nextDate.getMonth() + amount);
                    } else if (interval === "year") {
                        nextDate.setFullYear(nextDate.getFullYear() + amount);
                    } else if (interval === "week") {
                        if (!daysStr) {
                            nextDate.setDate(nextDate.getDate() + (amount * 7));
                        } else {
                            const targetDays = daysStr.split(",").map(Number);
                            const currentDayOfWeek = nextDate.getDay();
                            let daysToAdd = -1;
                            targetDays.sort((a, b) => a - b);

                            for (const d of targetDays) {
                                if (d > currentDayOfWeek) {
                                    daysToAdd = d - currentDayOfWeek;
                                    break;
                                }
                            }

                            if (daysToAdd !== -1) {
                                nextDate.setDate(nextDate.getDate() + daysToAdd);
                            } else {
                                const firstTargetDay = targetDays[0];
                                nextDate.setDate(nextDate.getDate() + (7 - currentDayOfWeek) + (amount - 1) * 7 + firstTargetDay);
                            }
                        }
                    }
                    incremented = true;
                }
            } else {
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
                    default:
                        // Unknown recurrence, skip safely to avoid infinite loops
                        continue;
                }
                incremented = true;

                // Aplica lógica de pular finais de semana APENAS para recorrências padrão
                const dayOfWeek = nextDate.getDay();
                if (dayOfWeek === 6) { // Sábado -> Segunda
                    nextDate.setDate(nextDate.getDate() + 2);
                } else if (dayOfWeek === 0) { // Domingo -> Segunda
                    nextDate.setDate(nextDate.getDate() + 1);
                }
            }

            if (!incremented) continue;

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
