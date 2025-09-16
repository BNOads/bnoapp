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
  gestorId?: string;
  csId?: string;
}

export function MensagemSemanal({ clienteId, gestorId, csId }: MensagemSemanalProps) {
  const [mensagem, setMensagem] = useState("");
  const [semanaReferencia, setSemanaReferencia] = useState(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [loading, setLoading] = useState(false);
  const [mensagemExistente, setMensagemExistente] = useState<any>(null);
  const { toast } = useToast();

  // Carregar mensagem existente para a semana
  useEffect(() => {
    const carregarMensagem = async () => {
      if (!clienteId || !semanaReferencia) return;

      const { data, error } = await supabase
        .from("mensagens_semanais")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("semana_referencia", semanaReferencia)
        .maybeSingle();

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

  const handleSalvar = async () => {
    if (!mensagem.trim()) {
      toast({
        title: "Erro",
        description: "A mensagem não pode estar vazia",
        variant: "destructive",
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
      const { data: colaborador, error: colaboradorError } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user.data.user.id)
        .single();

      if (colaboradorError || !colaborador) {
        throw new Error("Colaborador não encontrado para o usuário atual");
      }

      const dadosMensagem = {
        cliente_id: clienteId,
        gestor_id: colaborador.id, // Usar o ID do colaborador
        cs_id: csId,
        semana_referencia: semanaReferencia,
        mensagem: mensagem.trim(),
        created_by: user.data.user.id,
      };

      let result;
      if (mensagemExistente) {
        // Atualizar mensagem existente
        result = await supabase
          .from("mensagens_semanais")
          .update({
            mensagem: mensagem.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", mensagemExistente.id);
      } else {
        // Criar nova mensagem
        result = await supabase
          .from("mensagens_semanais")
          .insert(dadosMensagem);
      }

      if (result.error) {
        throw result.error;
      }

      toast({
        title: "Sucesso",
        description: mensagemExistente 
          ? "Mensagem atualizada com sucesso!"
          : "Mensagem salva com sucesso!",
      });

      // Recarregar dados
      const { data } = await supabase
        .from("mensagens_semanais")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("semana_referencia", semanaReferencia)
        .single();

      if (data) {
        setMensagemExistente(data);
      }
    } catch (error: any) {
      console.error("Erro ao salvar mensagem:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar mensagem",
        variant: "destructive",
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
        <div>
          <Label htmlFor="semana">Semana de Referência</Label>
          <Input
            id="semana"
            type="date"
            value={semanaReferencia}
            onChange={(e) => setSemanaReferencia(e.target.value)}
            className="mt-1"
          />
          <p className="text-sm text-muted-foreground mt-1">
            {semanaReferencia && format(new Date(semanaReferencia), "PPP", { locale: ptBR })}
          </p>
        </div>

        <div>
          <Label htmlFor="mensagem">Mensagem</Label>
          <Textarea
            id="mensagem"
            placeholder="Digite a mensagem semanal para o cliente..."
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={6}
            className="mt-1"
          />
        </div>

        {mensagemExistente && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Status de envio:</span>
            <span className={`font-medium ${
              mensagemExistente.enviado 
                ? "text-green-600" 
                : "text-red-600"
            }`}>
              {mensagemExistente.enviado ? "✅ Enviado" : "❌ Pendente"}
            </span>
            {mensagemExistente.enviado && mensagemExistente.enviado_em && (
              <span>
                em {format(new Date(mensagemExistente.enviado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            )}
          </div>
        )}

        <Button onClick={handleSalvar} disabled={loading} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Salvando..." : "Salvar Mensagem"}
        </Button>
      </CardContent>
    </Card>
  );
}