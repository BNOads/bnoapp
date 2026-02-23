import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MensagemSemanalProps {
  clienteId: string;
  clienteNome?: string;
  gestorId?: string;
  csId?: string;
}

export function MensagemSemanal({
  clienteId,
  clienteNome,
  gestorId,
  csId
}: MensagemSemanalProps) {
  const [mensagem, setMensagem] = useState("");
  const [semanaReferencia, setSemanaReferencia] = useState(format(startOfWeek(new Date(), {
    weekStartsOn: 1
  }), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [mensagemExistente, setMensagemExistente] = useState<any>(null);
  const {
    toast
  } = useToast();

  // Carregar mensagem existente para a semana
  useEffect(() => {
    const carregarMensagem = async () => {
      if (!clienteId || !semanaReferencia) return;
      const {
        data,
        error
      } = await supabase.from("mensagens_semanais").select("*").eq("cliente_id", clienteId).eq("semana_referencia", semanaReferencia).maybeSingle();
      if (error) {
        console.error("Erro ao carregar mensagem:", error);
        return;
      }
      if (data) {
        setMensagemExistente(data);
        setMensagem(data.mensagem);
      } else {
        setMensagemExistente(null);
        setMensagem("");
      }
    };
    carregarMensagem();
  }, [clienteId, semanaReferencia]);



  const gerarVersaoIABackground = async (mensagemId: string, textoBase: string) => {
    try {
      console.log("Iniciando geração de versão IA em background para mensagem:", mensagemId);

      const nomeParaIA = clienteNome || "Cliente";

      const { data, error } = await supabase.functions.invoke('formatar-mensagem-semanal', {
        body: {
          cliente_nome: nomeParaIA,
          rascunho: textoBase
        },
      });

      if (error) throw error;

      if (data?.mensagemFormato) {
        // Atualizar o registro com a versão gerada pela IA
        const { error: updateError } = await supabase
          .from("mensagens_semanais")
          .update({ mensagem_ia: data.mensagemFormato })
          .eq("id", mensagemId);

        if (updateError) throw updateError;
        console.log("Versão IA gerada e salva com sucesso em background.");

        // Se a mensagem que estamos visualizando for a mesma que acabou de ser atualizada,
        // vamos recarregá-la silenciosamente
        const { data: updatedMsg } = await supabase
          .from("mensagens_semanais")
          .select("*")
          .eq("id", mensagemId)
          .maybeSingle();

        if (updatedMsg) {
          setMensagemExistente(updatedMsg);
        }
      }
    } catch (error) {
      console.error("Erro na geração da IA em background:", error);
    }
  };

  const handleSalvar = async () => {
    if (!mensagem.trim()) {
      toast({
        title: "Erro",
        description: "A mensagem não pode estar vazia",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error("Usuário não autenticado");
      }

      // Buscar o colaborador associado ao usuário atual
      const {
        data: colaborador,
        error: colaboradorError
      } = await supabase.from("colaboradores").select("id").eq("user_id", user.data.user.id).maybeSingle();
      if (colaboradorError) {
        console.error("Erro ao buscar colaborador:", colaboradorError);
        throw new Error("Erro ao buscar dados do colaborador");
      }
      if (!colaborador) {
        throw new Error("Colaborador não encontrado para o usuário atual");
      }
      const agora = new Date().toISOString();
      const novoHistorico = {
        tipo: 'gestor_salvo',
        data: agora,
        user_id: user.data.user.id,
        colaborador_id: colaborador.id,
        detalhes: mensagemExistente ? 'Mensagem atualizada pelo gestor' : 'Mensagem criada pelo gestor'
      };
      const dadosMensagem = {
        cliente_id: clienteId,
        gestor_id: colaborador.id,
        cs_id: csId,
        semana_referencia: semanaReferencia,
        mensagem: mensagem.trim(),
        created_by: user.data.user.id,
        enviado_gestor_em: agora,
        historico_envios: mensagemExistente ? [...(mensagemExistente.historico_envios || []), novoHistorico] : [novoHistorico]
      };
      let result;
      let mensagemSalvaId;

      if (mensagemExistente) {
        // Atualizar mensagem existente
        result = await supabase.from("mensagens_semanais").update({
          mensagem: mensagem.trim(),
          updated_at: agora,
          enviado_gestor_em: agora,
          historico_envios: dadosMensagem.historico_envios
        }).eq("id", mensagemExistente.id).select('id').single();
        if (!result.error && result.data) mensagemSalvaId = result.data.id;
      } else {
        // Criar nova mensagem
        result = await supabase.from("mensagens_semanais").insert(dadosMensagem).select('id').single();
        if (!result.error && result.data) mensagemSalvaId = result.data.id;
      }

      if (result.error) {
        throw result.error;
      }
      toast({
        title: "Sucesso",
        description: mensagemExistente ? "Mensagem atualizada com sucesso!" : "Mensagem salva com sucesso!"
      });

      // Disparar a IA em background
      if (mensagemSalvaId) {
        gerarVersaoIABackground(mensagemSalvaId, mensagem.trim());
      }

      // Recarregar dados
      const {
        data
      } = await supabase.from("mensagens_semanais").select("*").eq("cliente_id", clienteId).eq("semana_referencia", semanaReferencia).maybeSingle();
      if (data) {
        setMensagemExistente(data);
      }
    } catch (error: any) {
      console.error("Erro ao salvar mensagem:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar mensagem",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Mensagem Semanal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="semana">Semana de Referência</Label>
          <Input
            id="semana"
            type="date"
            value={semanaReferencia}
            onChange={(e) => setSemanaReferencia(e.target.value)}
          />
        </div>

        <div className="space-y-2 relative">
          <Label htmlFor="mensagem">Mensagem / Rascunho</Label>
          <Textarea
            id="mensagem"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Digite os dados brutos ou a mensagem semanal para o cliente..."
            rows={10}
            className="resize-y min-h-[150px]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Dica: Jogue os números soltos aqui e clique em "Salvar". Uma versão aprimorada por Inteligência Artificial será gerada nos bastidores para uso da equipe de CS.
          </p>
        </div>

        <Button
          onClick={handleSalvar}
          disabled={loading}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Salvando..." : mensagemExistente ? "Atualizar Mensagem" : "Salvar Mensagem"}
        </Button>
      </CardContent>
    </Card>
  );
}