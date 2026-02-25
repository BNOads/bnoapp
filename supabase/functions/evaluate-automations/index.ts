import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

interface WebhookPayload {
  trigger_type: string;
  data: JsonRecord;
  automation_id?: string;
}

interface AutomationCondition {
  field?: string;
  operator?: "==" | "!=";
  value?: unknown;
}

interface AutomationAction {
  type?: string;
  payload?: JsonRecord;
}

interface TaskAutomation {
  id: string;
  name: string;
  trigger_conditions: AutomationCondition[] | null;
  actions: AutomationAction[] | null;
}

interface CollaboratorInfo {
  id: string;
  user_id: string | null;
  nome: string;
  email: string;
}

interface AutomationContext {
  trafficManager: CollaboratorInfo | null;
  csManager: CollaboratorInfo | null;
}

interface AssigneeResult {
  assignee: string | null;
  assignedToId: string | null;
  source: string;
}

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_REGEX.test(value);

const isDateString = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const asString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
};

const normalizeForComparison = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
};

const toDateIso = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (baseDate: Date, days: number): Date => {
  const next = new Date(baseDate);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const firstPresentString = (...values: unknown[]): string | null => {
  for (const value of values) {
    const result = asString(value);
    if (result) return result;
  }
  return null;
};

const asObject = (value: unknown): JsonRecord => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return {};
};

const parseVarAndOffset = (varName: string): { baseVar: string; offset: number } => {
  if (varName.includes("+") || varName.includes("-")) {
    const match = varName.match(/^(.+?)([+-]\d+)$/);
    if (match) {
      return { baseVar: match[1], offset: parseInt(match[2], 10) };
    }
  }
  return { baseVar: varName, offset: 0 };
};

const safeJson = (value: unknown): unknown => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { parse_error: "Failed to serialize details payload" };
  }
};

const pickSourceId = (payloadData: JsonRecord): string | null => {
  const cliente = asObject(payloadData.cliente);
  const lancamento = asObject(payloadData.lancamento);

  const candidates = [
    payloadData.user_id,
    payloadData.created_by,
    lancamento.created_by,
    cliente.created_by,
  ];

  for (const candidate of candidates) {
    if (isUuid(candidate)) {
      return candidate;
    }
  }

  return null;
};

const normalizeRecurrence = (value: unknown): string | null => {
  const allowed = new Set([
    "daily",
    "weekly",
    "biweekly",
    "monthly",
    "semiannual",
    "yearly",
  ]);

  const recurrence = asString(value);
  if (!recurrence || recurrence === "none") return null;
  return allowed.has(recurrence) ? recurrence : null;
};

const resolveDynamicDate = async (
  dateVar: string | null | undefined,
  triggerData: JsonRecord,
  supabase: any,
): Promise<string | null> => {
  if (!dateVar) return null;

  const { baseVar, offset } = parseVarAndOffset(dateVar);

  // 1. Launch variables (data_inicio_captacao, data_fim_captacao)
  if (baseVar === "data_inicio_captacao" || baseVar === "data_fim_captacao") {
    const lancamento = asObject(triggerData.lancamento);
    let raw = asString(lancamento[baseVar]);

    // Fallback: try to fetch from DB if ID is present
    if (!isDateString(raw)) {
      const lancId = asString(lancamento.id);
      if (lancId && isUuid(lancId)) {
        const { data: lancRow } = await supabase
          .from("lancamentos")
          .select(baseVar)
          .eq("id", lancId)
          .maybeSingle();
        raw = asString((lancRow as Record<string, unknown> | null)?.[baseVar]);
      }
    }

    if (isDateString(raw)) {
      return toDateIso(addDays(new Date(raw), offset));
    }
    return null;
  }

  // 2. Trigger/Gatilho variables
  if (baseVar === "today" || baseVar === "trigger_date" || baseVar === "trigger") {
    return toDateIso(addDays(new Date(), offset));
  }

  // Handle trigger_+X legacy or explicit format
  if (baseVar === "trigger_") { // This can happen if format was trigger_+7 and parseVarAndOffset split it
    return toDateIso(addDays(new Date(), offset));
  }

  // 3. Fixed offsets
  const fixedOffsets: Record<string, number> = {
    today: 0,
    tomorrow: 1,
    "3_days": 3,
    "7_days": 7,
    "15_days": 15,
    "30_days": 30,
  };

  if (fixedOffsets[baseVar] !== undefined) {
    return toDateIso(addDays(new Date(), fixedOffsets[baseVar] + offset));
  }

  // 4. Custom days (legacy custom_days field or custom_X prefix)
  if (baseVar === "custom_days") {
    // This expects custom_days_value in payload, which resolveDynamicDate doesn't have access to here easily.
    // However, the UI now serializes this as trigger_+X, so this is mostly for backward compatibility.
    // We'll skip complex payload drilling here and rely on the new serialization.
    return null;
  }

  if (baseVar.startsWith("custom_")) {
    const parsed = Number(baseVar.replace("custom_", ""));
    if (Number.isFinite(parsed) && parsed > 0) {
      return toDateIso(addDays(new Date(), parsed + offset));
    }
  }

  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = (await req.json()) as Partial<WebhookPayload>;
    console.log("[evaluate-automations] payload:", payload);

    if (!payload?.trigger_type || payload.data === undefined || payload.data === null) {
      throw new Error("Missing trigger_type or data in payload");
    }

    const payloadData = asObject(payload.data);
    const requestedAutomationId = payload.automation_id && isUuid(payload.automation_id)
      ? payload.automation_id
      : null;

    if (payload.automation_id && !requestedAutomationId) {
      throw new Error("Invalid automation_id in payload");
    }

    let automationsQuery = supabase
      .from("task_automations")
      .select("id, name, trigger_conditions, actions")
      .eq("trigger_type", payload.trigger_type)
      .eq("is_active", true);

    if (requestedAutomationId) {
      automationsQuery = automationsQuery.eq("id", requestedAutomationId);
    }

    const { data: automations, error: autoError } = await automationsQuery;

    if (autoError) throw autoError;

    const activeAutomations = (automations || []) as TaskAutomation[];
    console.log(
      `[evaluate-automations] found ${activeAutomations.length} automations for trigger ${payload.trigger_type}`,
    );

    if (activeAutomations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active automations found for this trigger.",
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const collaboratorCache = new Map<string, CollaboratorInfo | null>();
    let fallbackCreatorId: string | null | undefined;

    const findCollaboratorByIdOrUserId = async (
      identifier: unknown,
    ): Promise<CollaboratorInfo | null> => {
      if (!asString(identifier)) return null;
      const key = `id-or-user:${String(identifier)}`;

      if (collaboratorCache.has(key)) {
        return collaboratorCache.get(key) || null;
      }

      const idValue = String(identifier);

      const { data: byId, error: byIdError } = await supabase
        .from("colaboradores")
        .select("id, user_id, nome, email")
        .eq("id", idValue)
        .maybeSingle();

      if (byIdError) {
        console.error("[evaluate-automations] error loading collaborator by id:", byIdError);
      }

      if (byId) {
        collaboratorCache.set(key, byId as CollaboratorInfo);
        return byId as CollaboratorInfo;
      }

      const { data: byUserId, error: byUserIdError } = await supabase
        .from("colaboradores")
        .select("id, user_id, nome, email")
        .eq("user_id", idValue)
        .maybeSingle();

      if (byUserIdError) {
        console.error(
          "[evaluate-automations] error loading collaborator by user_id:",
          byUserIdError,
        );
      }

      const resolved = (byUserId as CollaboratorInfo | null) || null;
      collaboratorCache.set(key, resolved);
      return resolved;
    };

    const findCollaboratorByNameOrEmail = async (
      value: string,
    ): Promise<CollaboratorInfo | null> => {
      const key = `name-or-email:${value.toLowerCase()}`;
      if (collaboratorCache.has(key)) {
        return collaboratorCache.get(key) || null;
      }

      const { data: byName, error: byNameError } = await supabase
        .from("colaboradores")
        .select("id, user_id, nome, email")
        .eq("nome", value)
        .maybeSingle();

      if (byNameError) {
        console.error("[evaluate-automations] error loading collaborator by name:", byNameError);
      }

      if (byName) {
        collaboratorCache.set(key, byName as CollaboratorInfo);
        return byName as CollaboratorInfo;
      }

      const { data: byEmail, error: byEmailError } = await supabase
        .from("colaboradores")
        .select("id, user_id, nome, email")
        .eq("email", value)
        .maybeSingle();

      if (byEmailError) {
        console.error("[evaluate-automations] error loading collaborator by email:", byEmailError);
      }

      const resolved = (byEmail as CollaboratorInfo | null) || null;
      collaboratorCache.set(key, resolved);
      return resolved;
    };

    const getFallbackCreatorId = async (): Promise<string | null> => {
      if (fallbackCreatorId !== undefined) {
        return fallbackCreatorId;
      }

      const { data: adminUser, error: adminError } = await supabase
        .from("colaboradores")
        .select("user_id")
        .in("nivel_acesso", ["admin", "dono"])
        .eq("ativo", true)
        .not("user_id", "is", null)
        .limit(1)
        .maybeSingle();

      if (adminError) {
        console.error("[evaluate-automations] error loading fallback creator:", adminError);
      }

      fallbackCreatorId = adminUser?.user_id || null;
      return fallbackCreatorId;
    };

    const resolveAutomationContext = async (data: JsonRecord): Promise<AutomationContext> => {
      const cliente = asObject(data.cliente);
      const lancamento = asObject(data.lancamento);

      const trafficCandidates: unknown[] = [
        cliente.traffic_manager_id,
        lancamento.gestor_responsavel_id,
        data.gestor_responsavel_id,
        cliente.primary_gestor_user_id,
      ];

      const csCandidates: unknown[] = [
        cliente.cs_id,
        cliente.primary_cs_user_id,
      ];

      let trafficManager: CollaboratorInfo | null = null;
      for (const candidate of trafficCandidates) {
        if (!candidate) continue;
        const resolved = await findCollaboratorByIdOrUserId(candidate);
        if (resolved) {
          trafficManager = resolved;
          break;
        }
      }

      let csManager: CollaboratorInfo | null = null;
      for (const candidate of csCandidates) {
        if (!candidate) continue;
        const resolved = await findCollaboratorByIdOrUserId(candidate);
        if (resolved) {
          csManager = resolved;
          break;
        }
      }

      return { trafficManager, csManager };
    };

    const replaceVariables = (
      text: string | null | undefined,
      data: JsonRecord,
      context: AutomationContext,
    ): string => {
      if (!text) return "";

      const cliente = asObject(data.cliente);
      const funil = asObject(data.funil);
      const lancamento = asObject(data.lancamento);

      const managerName = firstPresentString(
        context.trafficManager?.nome,
        cliente.gestor_trafego_nome,
      );

      const csName = firstPresentString(context.csManager?.nome, cliente.cs_nome);

      const varMap: Record<string, string> = {
        "{nome_cliente}": firstPresentString(cliente.nome, data.nome_cliente) || "",
        "{instagram_cliente}": firstPresentString(cliente.instagram, data.instagram_cliente) || "",
        "{gestor_cliente}": managerName || "",
        "{cs_cliente}": csName || "",
        "{status_cliente}": firstPresentString(cliente.status_cliente, data.status_cliente) || "",
        "{nome_funil}": firstPresentString(funil.nome, data.nome_funil) || "",
        "{status_funil}":
          firstPresentString(funil.status, lancamento.status_lancamento, data.status_lancamento) || "",
        "{orcamento_funil}":
          firstPresentString(funil.orcamento, lancamento.investimento_total, data.investimento_total) ||
          "",
        "{nome_lancamento}":
          firstPresentString(lancamento.nome_lancamento, data.nome_lancamento) || "",
        "{status_lancamento}": firstPresentString(lancamento.status_lancamento, data.status_lancamento) || "",
        "{data_inicio_captacao}":
          firstPresentString(lancamento.data_inicio_captacao, data.data_inicio_captacao) || "",
        "{data_fim_captacao}":
          firstPresentString(lancamento.data_fim_captacao, data.data_fim_captacao) || "",
        "{data_atual}": new Date().toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        }),
      };

      let result = text;
      for (const [key, value] of Object.entries(varMap)) {
        result = result.replace(new RegExp(key, "g"), value);
      }

      return result;
    };

    const resolveAssignee = async (
      assigneeToken: unknown,
      data: JsonRecord,
      context: AutomationContext,
    ): Promise<AssigneeResult> => {
      const normalized = asString(assigneeToken);
      if (!normalized || normalized === "unassigned") {
        return {
          assignee: null,
          assignedToId: null,
          source: "unassigned",
        };
      }

      if (normalized === "{traffic_manager}") {
        if (context.trafficManager) {
          return {
            assignee: context.trafficManager.nome || context.trafficManager.email || null,
            assignedToId: context.trafficManager.user_id,
            source: "dynamic_traffic_manager",
          };
        }

        const cliente = asObject(data.cliente);
        if (isUuid(cliente.primary_gestor_user_id)) {
          return {
            assignee: firstPresentString(cliente.gestor_trafego_nome),
            assignedToId: cliente.primary_gestor_user_id,
            source: "dynamic_traffic_manager_fallback_user",
          };
        }

        return {
          assignee: null,
          assignedToId: null,
          source: "dynamic_traffic_manager_not_found",
        };
      }

      if (normalized === "{cs}") {
        if (context.csManager) {
          return {
            assignee: context.csManager.nome || context.csManager.email || null,
            assignedToId: context.csManager.user_id,
            source: "dynamic_cs",
          };
        }

        const cliente = asObject(data.cliente);
        if (isUuid(cliente.primary_cs_user_id)) {
          return {
            assignee: firstPresentString(cliente.cs_nome),
            assignedToId: cliente.primary_cs_user_id,
            source: "dynamic_cs_fallback_user",
          };
        }

        return {
          assignee: null,
          assignedToId: null,
          source: "dynamic_cs_not_found",
        };
      }

      if (isUuid(normalized)) {
        const collaborator = await findCollaboratorByIdOrUserId(normalized);
        if (collaborator) {
          return {
            assignee: collaborator.nome || collaborator.email || normalized,
            assignedToId: collaborator.user_id,
            source: "uuid_collaborator",
          };
        }

        return {
          assignee: null,
          assignedToId: normalized,
          source: "uuid_direct_user",
        };
      }

      const byNameOrEmail = await findCollaboratorByNameOrEmail(normalized);
      if (byNameOrEmail) {
        return {
          assignee: byNameOrEmail.nome || byNameOrEmail.email || normalized,
          assignedToId: byNameOrEmail.user_id,
          source: "name_or_email",
        };
      }

      return {
        assignee: normalized,
        assignedToId: null,
        source: "name_unresolved",
      };
    };

    const resolveConditionValue = (
      field: string | undefined,
      data: JsonRecord,
      context: AutomationContext,
    ): unknown => {
      const cliente = asObject(data.cliente);
      const funil = asObject(data.funil);
      const lancamento = asObject(data.lancamento);

      if (field === "traffic_manager" || field === "client_manager") {
        return firstPresentString(
          context.trafficManager?.nome,
          context.trafficManager?.email,
          cliente.gestor_trafego_nome,
        );
      }

      if (field === "client_status") {
        return firstPresentString(
          cliente.status_cliente,
          data.status_cliente,
        );
      }

      if (field === "launch_status") {
        return firstPresentString(
          lancamento.status_lancamento,
          data.status_lancamento,
        );
      }

      if (field === "cs_manager") {
        return firstPresentString(
          context.csManager?.nome,
          context.csManager?.email,
          cliente.cs_nome,
        );
      }

      if (field === "funnel_status") {
        return firstPresentString(
          funil.status,
          lancamento.status_lancamento,
          data.status_lancamento,
        );
      }

      if (field === "budget_value") {
        return firstPresentString(
          funil.orcamento,
          lancamento.investimento_total,
          data.investimento_total,
        );
      }

      return null;
    };

    const conditionsPass = (
      conditions: AutomationCondition[] | null,
      data: JsonRecord,
      context: AutomationContext,
    ): boolean => {
      if (!Array.isArray(conditions) || conditions.length === 0) {
        return true;
      }

      for (const condition of conditions) {
        const fieldValue = resolveConditionValue(condition.field, data, context);
        const expectedValue = condition.value;

        const left = normalizeForComparison(fieldValue);
        const right = normalizeForComparison(expectedValue);

        if (condition.operator === "==" && left !== right) {
          return false;
        }

        if (condition.operator === "!=" && left === right) {
          return false;
        }
      }

      return true;
    };

    const logAutomation = async (
      automationId: string,
      status: "success" | "error" | "skipped",
      message: string,
      details: unknown,
    ) => {
      const { error: logError } = await supabase.from("task_automation_logs").insert({
        automation_id: automationId,
        trigger_event: payload.trigger_type,
        status,
        message,
        details: safeJson(details),
      });

      if (logError) {
        console.error("[evaluate-automations] failed to write automation log:", logError);
      }
    };

    let processed = 0;

    for (const automation of activeAutomations) {
      const context = await resolveAutomationContext(payloadData);

      try {
        if (!conditionsPass(automation.trigger_conditions, payloadData, context)) {
          await logAutomation(
            automation.id,
            "skipped",
            "Condições da automação não atendidas.",
            {
              trigger_data: payloadData,
              trigger_conditions: automation.trigger_conditions,
            },
          );
          continue;
        }

        const actions = Array.isArray(automation.actions) ? automation.actions : [];
        if (actions.length === 0) {
          await logAutomation(
            automation.id,
            "skipped",
            "Automação sem ações configuradas.",
            { trigger_data: payloadData },
          );
          continue;
        }

        const actionResults: Array<Record<string, unknown>> = [];
        let hasError = false;

        for (const action of actions) {
          const actionType = action?.type || "unknown";
          const actionPayload = asObject(action?.payload);

          try {
            if (actionType === "create_task") {
              const title = replaceVariables(
                asString(actionPayload.title) || "Nova Tarefa Automática",
                payloadData,
                context,
              );
              const description = replaceVariables(
                asString(actionPayload.description) || "",
                payloadData,
                context,
              );

              const assigneeResult = await resolveAssignee(
                actionPayload.assignee,
                payloadData,
                context,
              );

              const recurrence = normalizeRecurrence(actionPayload.recurrence);

              // 1. Resolve Recurrence Start (if exists)
              const recurrenceStart = await resolveDynamicDate(
                asString(actionPayload.recurrence_start),
                payloadData,
                supabase
              );

              // 2. Resolve Due Date (only if no recurrence start or as a fallback)
              // Note: If recurrence is active, recurrenceStart takes precedence as the first due_date
              let dueDate = recurrenceStart;

              if (!dueDate) {
                dueDate = await resolveDynamicDate(
                  asString(actionPayload.due_date_var),
                  payloadData,
                  supabase
                );
              }

              // Legacy fallback for custom_days if not already resolved
              if (!dueDate && asString(actionPayload.due_date_var) === "custom_days") {
                const custom = Number(asString(actionPayload.custom_days_value) || "0");
                if (Number.isFinite(custom) && custom > 0) {
                  dueDate = toDateIso(addDays(new Date(), custom));
                }
              }

              const priorityRaw = asString(actionPayload.priority);
              const priority = ["alta", "media", "baixa"].includes(priorityRaw || "")
                ? (priorityRaw as "alta" | "media" | "baixa")
                : "media";

              const listId = isUuid(actionPayload.list_id) ? actionPayload.list_id : null;

              const cliente = asObject(payloadData.cliente);
              const lancamento = asObject(payloadData.lancamento);
              const clienteId =
                (isUuid(cliente.id) && cliente.id) ||
                (isUuid(payloadData.cliente_id) && payloadData.cliente_id) ||
                (isUuid(lancamento.cliente_id) && lancamento.cliente_id) ||
                null;

              const taskInsertPayload = {
                title,
                description: description || null,
                assignee: assigneeResult.assignee,
                assigned_to_id: assigneeResult.assignedToId,
                due_date: dueDate,
                priority,
                recurrence,
                list_id: listId,
                cliente_id: clienteId,
                created_by_id: pickSourceId(payloadData),
              };

              const { data: createdTask, error: taskError } = await supabase
                .from("tasks")
                .insert(taskInsertPayload)
                .select("id")
                .single();

              if (taskError) {
                throw new Error(`Error creating task: ${taskError.message}`);
              }

              await supabase.from("task_history").insert({
                task_id: createdTask.id,
                action: "created",
                changed_by: `Sistema (Automação: ${automation.name})`,
              });

              actionResults.push({
                action_type: actionType,
                status: "success",
                task_id: createdTask.id,
                assignee_source: assigneeResult.source,
              });
              continue;
            }

            if (actionType === "notify_team") {
              const message = replaceVariables(
                asString(actionPayload.message) || "Nova notificação da automação.",
                payloadData,
                context,
              );

              const creatorFromPayload = pickSourceId(payloadData);
              const creatorId = creatorFromPayload || (await getFallbackCreatorId());

              if (!creatorId) {
                throw new Error("Unable to resolve a valid `created_by` user for aviso");
              }

              const { error: notifError } = await supabase.from("avisos").insert({
                titulo: `Aviso Automático: ${automation.name}`,
                conteudo: message,
                tipo: "info",
                prioridade: "normal",
                canais: { sistema: true, email: false },
                fonte: "automacao",
                metadata: {
                  origin_trigger: payload.trigger_type,
                  automation_id: automation.id,
                  automation_name: automation.name,
                },
                created_by: creatorId,
              });

              if (notifError) {
                throw new Error(`Error creating notification: ${notifError.message}`);
              }

              actionResults.push({
                action_type: actionType,
                status: "success",
              });
              continue;
            }

            actionResults.push({
              action_type: actionType,
              status: "skipped",
              message: "Ação não suportada no executor atual.",
            });
          } catch (actionError) {
            hasError = true;
            actionResults.push({
              action_type: actionType,
              status: "error",
              error: (actionError as Error).message,
            });
          }
        }

        const successCount = actionResults.filter((r) => r.status === "success").length;
        const errorCount = actionResults.filter((r) => r.status === "error").length;

        await logAutomation(
          automation.id,
          hasError ? "error" : "success",
          hasError
            ? `Automação executada com falhas (${successCount} sucesso, ${errorCount} erro).`
            : `Automação executada com sucesso (${successCount} ação(ões)).`,
          {
            trigger_data: payloadData,
            action_results: actionResults,
          },
        );

        processed += 1;
      } catch (execError) {
        console.error(`[evaluate-automations] execution error for ${automation.id}:`, execError);
        await logAutomation(
          automation.id,
          "error",
          (execError as Error).message,
          { trigger_data: payloadData },
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Automations processed.",
        processed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[evaluate-automations] fatal error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
