import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Target, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TextBlockEditor } from "./TextBlockEditor";
import { ValoresGrid } from "./ValoresGrid";

export const MissaoVisaoValoresTab = () => {
  const { isAdmin } = useUserPermissions();
  const { toast } = useToast();

  const [missao, setMissao] = useState("");
  const [visao, setVisao] = useState("");
  const [valores, setValores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarDados = useCallback(async () => {
    try {
      // Fetch config and valores in parallel
      const [configRes, valoresRes] = await Promise.all([
        supabase.from("cultura_config").select("*"),
        supabase.from("cultura_valores").select("*").order("ordem", { ascending: true }),
      ]);

      if (configRes.error) throw configRes.error;
      if (valoresRes.error) throw valoresRes.error;

      const configData = configRes.data || [];
      const missaoRow = configData.find((r: any) => r.chave === "missao");
      const visaoRow = configData.find((r: any) => r.chave === "visao");

      setMissao(missaoRow?.valor || "");
      setVisao(visaoRow?.valor || "");
      setValores(valoresRes.data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleSaveConfig = async (chave: string, valor: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("cultura_config")
        .update({
          valor,
          atualizado_em: new Date().toISOString(),
          atualizado_por: user?.id,
        })
        .eq("chave", chave);

      if (error) throw error;

      if (chave === "missao") setMissao(valor);
      if (chave === "visao") setVisao(valor);

      toast({ title: "Salvo com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Missão & Visão */}
      <Card className="p-6 bg-card border border-border space-y-6">
        <TextBlockEditor
          title="Missão"
          icon={<Target className="h-5 w-5 text-primary" />}
          value={missao}
          isAdmin={isAdmin}
          onSave={(val) => handleSaveConfig("missao", val)}
        />

        <div className="border-t border-border" />

        <TextBlockEditor
          title="Visão"
          icon={<Eye className="h-5 w-5 text-primary" />}
          value={visao}
          isAdmin={isAdmin}
          onSave={(val) => handleSaveConfig("visao", val)}
        />
      </Card>

      {/* Valores */}
      <ValoresGrid valores={valores} isAdmin={isAdmin} onRefresh={carregarDados} />
    </div>
  );
};
