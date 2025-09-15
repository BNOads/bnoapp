import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Hash, AtSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SlackChannel {
  id: string;
  name: string;
  real_name?: string;
  is_channel: boolean;
  is_member?: boolean;
}

interface AgendaData {
  title: string;
  content: string;
  date: string;
  attachments?: string[];
}

interface EnviarSlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  agenda: AgendaData;
}

export function EnviarSlackModal({ isOpen, onClose, agenda }: EnviarSlackModalProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const { toast } = useToast();

  // Load channels when modal opens
  useEffect(() => {
    if (isOpen) {
      loadChannels();
    }
  }, [isOpen]);

  const loadChannels = async () => {
    try {
      setLoadingChannels(true);
      
      const { data, error } = await supabase.functions.invoke('slack-agenda/channels', {
        method: 'GET',
      });

      if (error) throw error;

      if (data?.success) {
        setChannels(data.channels || []);
      } else {
        throw new Error(data?.error || 'Failed to load channels');
      }
    } catch (error) {
      console.error('Error loading Slack channels:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar canais do Slack. Verifique a configuração do bot.",
        variant: "destructive",
      });
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleSend = async () => {
    if (!selectedChannel) {
      toast({
        title: "Atenção",
        description: "Selecione um canal ou usuário para enviar a pauta.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Get current URL for Lovable link
      const currentUrl = window.location.href;

      const { data, error } = await supabase.functions.invoke('slack-agenda/send-agenda', {
        body: {
          channel: selectedChannel,
          includeAttachments,
          agenda: {
            title: agenda.title,
            date: agenda.date,
            content: agenda.content,
            attachments: agenda.attachments || [],
            lovableUrl: currentUrl,
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sucesso",
          description: "✅ Pauta enviada para o Slack",
        });
        onClose();
      } else {
        throw new Error(data?.error || 'Failed to send agenda');
      }
    } catch (error) {
      console.error('Error sending to Slack:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar pauta para o Slack. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderChannelOption = (channel: SlackChannel) => {
    const icon = channel.is_channel ? <Hash className="h-3 w-3" /> : <AtSign className="h-3 w-3" />;
    const displayName = channel.real_name ? `${channel.name} (${channel.real_name})` : channel.name;
    
    return (
      <SelectItem key={channel.id} value={channel.id}>
        <div className="flex items-center gap-2">
          {icon}
          <span>{displayName}</span>
          {channel.is_member === false && channel.is_channel && (
            <Badge variant="outline" className="text-xs">Não membro</Badge>
          )}
        </div>
      </SelectItem>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Enviar Pauta no Slack
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview da pauta */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Preview da Mensagem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <strong>Mensagem principal:</strong>
                <div className="bg-muted p-2 rounded text-xs mt-1">
                  📌 {agenda.title} - {agenda.date}
                </div>
              </div>
              <div className="text-sm">
                <strong>Reply com conteúdo:</strong>
                <div className="bg-muted p-2 rounded text-xs mt-1 max-h-20 overflow-y-auto">
                  📝 Conteúdo da Pauta: {agenda.content.substring(0, 100)}...
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seleção de canal */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Canal ou Usuário</label>
            <Select value={selectedChannel} onValueChange={setSelectedChannel} disabled={loadingChannels}>
              <SelectTrigger>
                <SelectValue placeholder={loadingChannels ? "Carregando canais..." : "Selecione um canal ou usuário"} />
              </SelectTrigger>
              <SelectContent>
                {loadingChannels ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Canais */}
                    {channels.filter(c => c.is_channel).length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Canais</div>
                        {channels.filter(c => c.is_channel).map(renderChannelOption)}
                      </>
                    )}
                    
                    {/* Usuários */}
                    {channels.filter(c => !c.is_channel).length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Usuários</div>
                        {channels.filter(c => !c.is_channel).map(renderChannelOption)}
                      </>
                    )}
                    
                    {channels.length === 0 && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        Nenhum canal encontrado
                      </div>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Opções */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="attachments" 
                checked={includeAttachments}
                onCheckedChange={(checked) => setIncludeAttachments(checked === true)}
              />
              <label htmlFor="attachments" className="text-sm">
                Incluir anexos (imagens/vídeos)
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={loading || !selectedChannel}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar no Slack
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}