import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TesteVencendo {
  id: string;
  nome: string;
  label: string;
  subtitle: string;
  diasRestantes: number | null; // null = no data_fim, uses diasRodando
  diasRodando: number;
  tipo: 'vencendo' | 'rodando_longo' | 'normal';
}

export function TestesProximosVencer() {
  const navigate = useNavigate();
  const { isAdmin, loading: permLoading } = useUserPermissions();
  const { userData, loading: userLoading } = useCurrentUser();
  const [testes, setTestes] = useState<TesteVencendo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait until permissions and user data are loaded
    if (permLoading || userLoading) return;
    carregarTestes();
  }, [permLoading, userLoading, userData, isAdmin]);

  const carregarTestes = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('testes_laboratorio')
        .select(`
          id, nome, data_inicio, data_fim, created_at, created_by,
          cliente:clientes!cliente_id(nome),
          gestor:gestor_responsavel_id(id, nome)
        `)
        .eq('status', 'rodando')
        .eq('arquivado', false);

      // Non-admins only see their own tests (managed OR created)
      if (!isAdmin && userData?.id) {
        query = query.or(`gestor_responsavel_id.eq.${userData.id},created_by.eq.${userData.user_id}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const resultado: TesteVencendo[] = [];

      for (const t of (data || []) as any[]) {
        const clienteNome = t.cliente?.nome || 'Sem cliente';
        const gestorNome = t.gestor?.nome || null;
        const gestorLabel = isAdmin && gestorNome ? ` · ${gestorNome}` : '';

        // Fallback to created_at if data_inicio is missing
        const startDateStr = t.data_inicio || t.created_at;
        const startDate = startDateStr ? new Date(startDateStr.split('T')[0] + 'T00:00:00') : new Date();



        // Tests with a planned data_fim approaching/past
        if (t.data_fim) {
          const dataFim = new Date(t.data_fim + 'T00:00:00');
          const dias = differenceInDays(dataFim, hoje);
          if (dias <= 7) {
            resultado.push({
              id: t.id,
              nome: t.nome,
              diasRestantes: dias,
              diasRodando: differenceInDays(hoje, startDate),
              tipo: 'vencendo',
              label: dias < 0
                ? `Vencido ${Math.abs(dias)}d`
                : dias === 0
                  ? 'Vence hoje!'
                  : dias === 1
                    ? 'Amanha'
                    : `${dias} dias`,
              subtitle: `${clienteNome}${gestorLabel} · Fim: ${format(dataFim, "dd/MM", { locale: ptBR })}`,
            });
          } else {
            // Normal running test with deadline far away
            resultado.push({
              id: t.id,
              nome: t.nome,
              diasRestantes: dias,
              diasRodando: differenceInDays(hoje, startDate),
              tipo: 'normal',
              label: `${dias} dias restantes`,
              subtitle: `${clienteNome}${gestorLabel} · Fim: ${format(dataFim, "dd/MM", { locale: ptBR })}`,
            });
          }
        }
        // Tests running for more than 14 days without data_fim
        else if (startDate) {
          const diasRodando = differenceInDays(hoje, startDate);
          if (diasRodando >= 14) {
            resultado.push({
              id: t.id,
              nome: t.nome,
              diasRestantes: null,
              diasRodando,
              tipo: 'rodando_longo',
              label: `${diasRodando}d rodando`,
              subtitle: `${clienteNome}${gestorLabel} · Inicio: ${format(dataInicio, "dd/MM", { locale: ptBR })}`,
            });
          } else {
            // Normal running test
            resultado.push({
              id: t.id,
              nome: t.nome,
              diasRestantes: null,
              diasRodando,
              tipo: 'normal',
              label: 'Em andamento',
              subtitle: `${clienteNome}${gestorLabel} · Inicio: ${format(startDate, "dd/MM", { locale: ptBR })}`,
            });
          }
        }
      }

      // Sort: overdue first, then by urgency
      resultado.sort((a, b) => {
        // vencendo comes before rodando_longo
        if (a.tipo !== b.tipo) return a.tipo === 'vencendo' ? -1 : 1;
        if (a.tipo === 'vencendo' && b.tipo === 'vencendo') {
          return (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0);
        }
        return b.diasRodando - a.diasRodando;
      });

      setTestes(resultado);
    } catch (error) {
      console.error('Erro ao carregar testes proximos de vencer:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || testes.length === 0) {
    return null;
  }

  const getStyle = (teste: TesteVencendo) => {
    if (teste.tipo === 'vencendo') {
      const dias = teste.diasRestantes ?? 0;
      if (dias < 0) return { badgeClass: "bg-red-500 text-white border-red-500", rowClass: "bg-red-50 border border-red-200 hover:bg-red-100", iconBg: "bg-red-100", iconClass: "text-red-600", isAlert: true };
      if (dias === 0) return { badgeClass: "bg-red-500 text-white border-red-500 animate-pulse", rowClass: "bg-red-50 border border-red-200 hover:bg-red-100", iconBg: "bg-red-100", iconClass: "text-red-600", isAlert: true };
      if (dias <= 3) return { badgeClass: "bg-amber-500 text-white border-amber-500", rowClass: "bg-amber-50 border border-amber-200 hover:bg-amber-100", iconBg: "bg-amber-100", iconClass: "text-amber-600", isAlert: false };
      return { badgeClass: "bg-slate-100 text-slate-700 border-slate-200", rowClass: "bg-muted/50 hover:bg-muted", iconBg: "bg-slate-100", iconClass: "text-slate-600", isAlert: false };
    }
    if (teste.tipo === 'rodando_longo') {
      return { badgeClass: "bg-blue-100 text-blue-700 border-blue-200", rowClass: "bg-blue-50/50 border border-blue-100 hover:bg-blue-50", iconBg: "bg-blue-100", iconClass: "text-blue-600", isAlert: false };
    }

    // normal
    return { badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200", rowClass: "bg-white border-border hover:bg-muted/50", iconBg: "bg-emerald-100", iconClass: "text-emerald-600", isAlert: false };
  };

  return (
    <Card className="border-2 border-violet-100 bg-gradient-to-br from-violet-50/50 to-background shadow-lg overflow-hidden">
      <CardHeader
        className="pb-3 cursor-pointer transition-colors hover:opacity-80"
        onClick={() => navigate("/laboratorio-testes")}
      >
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-full bg-violet-100">
            <FlaskConical className="h-5 w-5 text-violet-600" />
          </div>
          <span>Testes Rodando</span>
          <Badge variant="secondary" className="ml-auto bg-violet-100 text-violet-700">
            {testes.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {testes.map((teste) => {
          const { badgeClass, rowClass, iconBg, iconClass, isAlert } = getStyle(teste);

          return (
            <button
              key={teste.id}
              onClick={() => navigate(`/laboratorio-testes/${teste.id}`)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${rowClass}`}
            >
              <div className={`p-1.5 rounded-md ${iconBg}`}>
                {isAlert ? (
                  <AlertTriangle className={`h-4 w-4 ${iconClass}`} />
                ) : (
                  <Clock className={`h-4 w-4 ${iconClass}`} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{teste.nome}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {teste.subtitle}
                </p>
              </div>

              <Badge variant="outline" className={badgeClass}>
                {teste.label}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
