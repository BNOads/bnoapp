import React, { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, History, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/Auth/AuthContext";

interface KickoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNome: string;
}

interface KickoffVersion {
  id: string;
  version: number;
  created_at: string;
  created_by: string;
}

const INITIAL_TEXT_TEMPLATE = `# Kickoff - {{client_name}}

`;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Erro inesperado";
};

export const KickoffModal = ({ isOpen, onClose, clienteId, clienteNome }: KickoffModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [kickoffId, setKickoffId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [versions, setVersions] = useState<KickoffVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialContent = INITIAL_TEXT_TEMPLATE.replace("{{client_name}}", clienteNome);

  const loadVersions = useCallback(async (currentKickoffId: string) => {
    const { data, error } = await supabase
      .from("kickoff_content")
      .select("id, version, created_at, created_by")
      .eq("kickoff_id", currentKickoffId)
      .order("version", { ascending: false });

    if (error) throw error;
    setVersions((data || []) as KickoffVersion[]);
  }, []);

  const loadKickoffContent = useCallback(async (currentKickoffId: string) => {
    const { data: kickoffContent, error } = await supabase
      .from("kickoff_content")
      .select("content_md, version")
      .eq("kickoff_id", currentKickoffId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;

    if (kickoffContent) {
      setContent(kickoffContent.content_md || "");
      setCurrentVersion(kickoffContent.version || 1);
    } else {
      setContent(initialContent);
      setCurrentVersion(0);
    }

    await loadVersions(currentKickoffId);
  }, [initialContent, loadVersions]);

  const createNewKickoff = useCallback(async () => {
    if (!user?.id) throw new Error("Usuário não autenticado.");

    const { data: kickoff, error: kickoffError } = await supabase
      .from("kickoffs")
      .insert({
        client_id: clienteId,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (kickoffError) throw kickoffError;

    setKickoffId(kickoff.id);

    const { error: contentError } = await supabase
      .from("kickoff_content")
      .insert({
        kickoff_id: kickoff.id,
        content_md: initialContent,
        version: 1,
        created_by: user.id,
      });

    if (contentError) throw contentError;

    setCurrentVersion(1);
    setContent(initialContent);
    await loadVersions(kickoff.id);
  }, [clienteId, initialContent, loadVersions, user?.id]);

  const loadKickoff = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data: kickoff, error: kickoffError } = await supabase
        .from("kickoffs")
        .select("id")
        .eq("client_id", clienteId)
        .maybeSingle();

      if (kickoffError && kickoffError.code !== "PGRST116") {
        throw kickoffError;
      }

      if (!kickoff) {
        await createNewKickoff();
        return;
      }

      setKickoffId(kickoff.id);
      await loadKickoffContent(kickoff.id);
    } catch (error: unknown) {
      console.error("Erro ao carregar kickoff:", error);
      toast({
        title: "Erro",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [clienteId, createNewKickoff, loadKickoffContent, toast]);

  useEffect(() => {
    if (isOpen && clienteId) {
      void loadKickoff();
    }
  }, [isOpen, clienteId, loadKickoff]);

  const handleSave = async () => {
    if (!kickoffId) return;
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      const nextVersion = currentVersion + 1;
      const { error } = await supabase
        .from("kickoff_content")
        .insert({
          kickoff_id: kickoffId,
          content_md: content,
          version: nextVersion,
          created_by: user.id,
        });

      if (error) throw error;

      setCurrentVersion(nextVersion);
      await loadVersions(kickoffId);

      toast({
        title: "Sucesso",
        description: `Kickoff salvo - versão ${nextVersion}.`,
      });
    } catch (error: unknown) {
      console.error("Erro ao salvar kickoff:", error);
      toast({
        title: "Erro",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Kickoff - {clienteNome}
            <Badge variant="outline">v{currentVersion}</Badge>
          </DialogTitle>
          <DialogDescription>
            Editor de texto simples para o kickoff do cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          {versions.length > 1 ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <History className="h-3 w-3" />
              {versions.length} versões
            </Badge>
          ) : (
            <div />
          )}
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Digite o kickoff do cliente..."
          className="min-h-[460px] font-mono text-sm"
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
