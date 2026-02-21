import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
    trigger_type: string;
    data: any;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const payload: WebhookPayload = await req.json();
        console.log('Evaluate Automations Payload:', payload);

        if (!payload.trigger_type || !payload.data) {
            throw new Error("Missing trigger_type or data in payload");
        }

        const { data: automations, error: autoError } = await supabase
            .from('task_automations')
            .select('*')
            .eq('trigger_type', payload.trigger_type)
            .eq('is_active', true);

        if (autoError) throw autoError;

        console.log(`Found ${automations?.length || 0} active automations for ${payload.trigger_type}`);

        if (!automations || automations.length === 0) {
            return new Response(JSON.stringify({ message: "No active automations found for this trigger." }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const replaceVariables = (text: string, data: any) => {
            if (!text) return text;
            let result = text;

            const varMap: Record<string, string> = {
                '{nome_cliente}': data.cliente?.nome || '',
                '{instagram_cliente}': data.cliente?.instagram || '',
                '{nome_funil}': data.funil?.nome || '',
                '{status_funil}': data.funil?.status || '',
                '{orcamento_funil}': data.funil?.orcamento || '',
                '{nome_lancamento}': data.lancamento?.nome_lancamento || '',
                '{data_atual}': new Date().toLocaleDateString('pt-BR'),
            };

            for (const [key, value] of Object.entries(varMap)) {
                result = result.replace(new RegExp(key, 'g'), String(value || ''));
            }
            return result;
        };

        const processDynamicAssignee = (assignee: string, data: any) => {
            if (!assignee) return null;
            if (assignee === '{traffic_manager}') return data.cliente?.gestor_trafego_id || data.gestor_responsavel_id;
            if (assignee === '{cs}') return data.cliente?.cs_id;
            if (assignee === 'unassigned') return null;
            return assignee; // Assumes it is a UUID if not a variable
        }

        for (const automation of automations) {
            try {
                console.log(`Evaluating automation: ${automation.name} (${automation.id})`);
                let conditionsMet = true;

                // 1. Evaluate Conditions
                if (automation.trigger_conditions && Array.isArray(automation.trigger_conditions)) {
                    for (const cond of automation.trigger_conditions) {
                        let dataValue = null;
                        if (cond.field === 'traffic_manager' || cond.field === 'client_manager') {
                            dataValue = data.cliente?.gestor_trafego_nome;
                        } else if (cond.field === 'cs_manager') {
                            dataValue = data.cliente?.cs_nome;
                        } else if (cond.field === 'funnel_status') {
                            dataValue = data.status_lancamento || data.funil?.status;
                        } else if (cond.field === 'budget_value') {
                            dataValue = data.investimento_total || data.funil?.orcamento;
                        }

                        if (cond.operator === '==') {
                            if (String(dataValue) !== String(cond.value)) conditionsMet = false;
                        } else if (cond.operator === '!=') {
                            if (String(dataValue) === String(cond.value)) conditionsMet = false;
                        }
                        if (!conditionsMet) break;
                    }
                }

                if (!conditionsMet) {
                    console.log(`Conditions not met for automation: ${automation.name}`);
                    await supabase.from('task_automation_logs').insert({
                        automation_id: automation.id,
                        trigger_event: payload.trigger_type,
                        status: 'skipped',
                        message: 'Conditions not met.',
                        details: payload.data
                    });
                    continue;
                }

                // 2. Execute Actions
                console.log(`Conditions MET for automation: ${automation.name}. Executing actions...`);

                for (const action of automation.actions || []) {
                    if (action.type === 'create_task') {
                        const title = replaceVariables(action.payload?.title || "Nova Tarefa Automática", data);
                        const description = replaceVariables(action.payload?.description || "", data);

                        const assignee_id = processDynamicAssignee(action.payload?.assignee, data);

                        const { error: taskError } = await supabase.from('tarefas').insert({
                            titulo: title,
                            descricao: description,
                            responsavel_id: assignee_id,
                            status: 'pendente',
                            fonte: 'automacao',
                            created_by: data.user_id || null, // Best effort
                            cliente_id: data.cliente?.id || data.cliente_id || null,
                        });

                        if (taskError) throw new Error(`Error creating task: ${taskError.message}`);
                    } else if (action.type === 'notify_team') {
                        const message = replaceVariables(action.payload?.message || "Nova notificação da automação.", data);
                        const { error: notifError } = await supabase.from('avisos').insert({
                            titulo: `Aviso Automático: ${automation.name}`,
                            conteudo: message,
                            tipo: 'info',
                            prioridade: 'normal',
                            canais: { sistema: true, email: false },
                            fonte: 'automacao',
                            metadata: {
                                origin_trigger: payload.trigger_type,
                                automation_id: automation.id,
                                automation_name: automation.name,
                            }
                        });
                        if (notifError) throw new Error(`Error creating notification: ${notifError.message}`);
                    }
                }

                // 3. Log Success
                await supabase.from('task_automation_logs').insert({
                    automation_id: automation.id,
                    trigger_event: payload.trigger_type,
                    status: 'success',
                    message: 'All actions executed successfully.',
                    details: payload.data
                });

            } catch (execError: any) {
                console.error(`Error executing automation ${automation.id}:`, execError);
                await supabase.from('task_automation_logs').insert({
                    automation_id: automation.id,
                    trigger_event: payload.trigger_type,
                    status: 'error',
                    message: execError.message,
                    details: payload.data
                });
            }
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Automations processed.' }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Webhook error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal Server Error', details: (error as Error).message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
