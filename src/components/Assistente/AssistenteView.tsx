import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Bot, User, Send, Mic, MessageSquare, Plus, Search, History, X, Edit3, Trash2, Check, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface Conversation {
  id: string;
  titulo: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export const AssistenteView = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false); // Iniciar fechado para mobile
  const [searchQuery, setSearchQuery] = useState('');
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { userData } = useCurrentUser();
  const isMobile = useIsMobile();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadConversations();
    // Só mostrar histórico automaticamente em desktop
    if (!isMobile) {
      setShowHistory(true);
    }
  }, [isMobile]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('assistente_conversas')
        .select(`
          id, titulo, created_at, updated_at,
          assistente_mensagens(count)
        `)
        .eq('ativo', true)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const conversationsWithCount = data?.map(conv => ({
        ...conv,
        message_count: conv.assistente_mensagens?.[0]?.count || 0
      })) || [];

      setConversations(conversationsWithCount);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('assistente_mensagens')
        .select('*')
        .eq('conversa_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = data?.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        metadata: msg.metadata
      })) || [];

      setMessages(formattedMessages);
      setCurrentConversationId(conversationId);
      // Fechar histórico mobile após selecionar
      if (isMobile) {
        setMobileHistoryOpen(false);
      }
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
      toast.error('Erro ao carregar conversa');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async (firstMessage: string) => {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Gerar título baseado na primeira mensagem
      const titulo = firstMessage.length > 50 
        ? firstMessage.substring(0, 47) + '...'
        : firstMessage;

      const { data: conversation, error: convError } = await supabase
        .from('assistente_conversas')
        .insert({
          titulo,
          user_id: user.id
        })
        .select()
        .single();

      if (convError) throw convError;

      setCurrentConversationId(conversation.id);
      return conversation.id;
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      throw error;
    }
  };

  const saveMessage = async (conversationId: string, role: 'user' | 'assistant', content: string, metadata?: any) => {
    try {
      const { error } = await supabase
        .from('assistente_mensagens')
        .insert({
          conversa_id: conversationId,
          role,
          content,
          metadata: metadata || {}
        });

      if (error) throw error;

      // Atualizar timestamp da conversa
      await supabase
        .from('assistente_conversas')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      let conversationId = currentConversationId;
      
      // Criar nova conversa se necessário
      if (!conversationId) {
        conversationId = await createNewConversation(userMessage);
      }

      // Adicionar mensagem do usuário
      const newUserMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, newUserMessage]);

      // Salvar mensagem do usuário
      await saveMessage(conversationId, 'user', userMessage);

      // Chamar API do assistente com o ID da conversa para carregar histórico
      const { data, error } = await supabase.functions.invoke('assistente-chat', {
        body: { 
          message: userMessage,
          conversaId: conversationId 
        }
      });

      if (error) throw error;

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Salvar resposta do assistente
        await saveMessage(conversationId, 'assistant', data.response);

        // Recarregar lista de conversas
        await loadConversations();
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao processar mensagem. Tente novamente.');
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // Shift+Enter permite quebra de linha (comportamento padrão do textarea)
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    // Fechar histórico mobile após nova conversa
    if (isMobile) {
      setMobileHistoryOpen(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('assistente_conversas')
        .update({ ativo: false })
        .eq('id', conversationId);

      if (error) throw error;

      await loadConversations();
      
      if (currentConversationId === conversationId) {
        startNewChat();
      }

      toast.success('Conversa excluída');
    } catch (error) {
      console.error('Erro ao excluir conversa:', error);
      toast.error('Erro ao excluir conversa');
    }
  };

  const editConversation = async (conversationId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('assistente_conversas')
        .update({ titulo: newTitle.trim() })
        .eq('id', conversationId);

      if (error) throw error;

      await loadConversations();
      setEditingConversationId(null);
      setEditTitle('');
      
      toast.success('Título da conversa atualizado');
    } catch (error) {
      console.error('Erro ao editar conversa:', error);
      toast.error('Erro ao editar conversa');
    }
  };

  const startEditing = (conversation: Conversation) => {
    setEditingConversationId(conversation.id);
    setEditTitle(conversation.titulo);
  };

  const cancelEditing = () => {
    setEditingConversationId(null);
    setEditTitle('');
  };

  const filteredConversations = conversations.filter(conv =>
    conv.titulo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Componente do histórico para reutilização
  const HistoryContent = () => (
    <div className="w-full h-full bg-card border-r border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico
          </h2>
          {!isMobile && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowHistory(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button 
          onClick={startNewChat}
          className="w-full flex items-center gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Nova Conversa
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-2">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group relative rounded-lg mb-2 transition-colors ${
                currentConversationId === conversation.id
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted'
              }`}
            >
              {editingConversationId === conversation.id ? (
                <div className="p-3">
                  <div className="flex gap-2 items-center">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 text-sm"
                      placeholder="Título da conversa"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          editConversation(conversation.id, editTitle);
                        } else if (e.key === 'Escape') {
                          cancelEditing();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => editConversation(conversation.id, editTitle)}
                      disabled={!editTitle.trim()}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEditing}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => loadConversation(conversation.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm leading-relaxed break-words">
                        {conversation.titulo || 'Conversa sem título'}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(conversation.updated_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {conversation.message_count}
                      </Badge>
                      
                      <div className="flex gap-1 ml-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(conversation);
                          }}
                          className="h-6 w-6 p-0 hover:bg-primary/20"
                          title="Editar título"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conversation.id);
                          }}
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/20 hover:text-destructive"
                          title="Excluir conversa"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const formatMessageContent = (content: string) => {
    // Formatação básica de markdown
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/###\s(.*?)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/##\s(.*?)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="flex h-screen max-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && showHistory && (
        <div className="w-80 flex-shrink-0">
          <HistoryContent />
        </div>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <HistoryContent />
          </SheetContent>
        </Sheet>
      )}

      {/* Chat Principal */}
      <div className="flex-1 flex flex-col h-screen min-w-0">
        <Card className="flex-1 border-0 rounded-none flex flex-col">
          <CardHeader className="border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 min-w-0">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileHistoryOpen(true)}
                    className="p-2 mr-2"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                )}
                <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                <span className="text-sm sm:text-base truncate">Assistente BNOads</span>
                <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                  IA Integrada
                </Badge>
              </CardTitle>
              
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {!isMobile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden md:inline">Histórico</span>
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startNewChat}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nova</span>
                </Button>
              </div>
            </div>
            
            {!messages.length && (
              <div className="text-sm text-muted-foreground">
                💡 <strong>Agora integrado!</strong> Posso consultar seus painéis, referências, aulas e dados do sistema
              </div>
            )}
          </CardHeader>

          <CardContent className="flex-1 p-0 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
                    <Bot className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Olá, {userData?.nome?.split(' ')[0] || 'usuário'}! 👋
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      Sou seu assistente inteligente integrado ao sistema. Posso ajudar com:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm">
                      <div className="p-2 bg-muted rounded">📊 Painéis de cliente</div>
                      <div className="p-2 bg-muted rounded">🎨 Referências criativas</div>
                      <div className="p-2 bg-muted rounded">🎓 Aulas e cursos</div>
                      <div className="p-2 bg-muted rounded">🎥 Gravações de reuniões</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {message.role === 'assistant' && (
                        <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                          <AvatarImage src="/lovable-uploads/04b4bc6e-c3c0-4f8e-9819-9f578ec4da19.png" alt="Assistente" />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className={`max-w-[85%] sm:max-w-[70%] ${message.role === 'user' ? 'order-1' : ''}`}>
                        <div className={`rounded-lg px-3 py-2 ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground ml-auto' 
                            : 'bg-muted'
                        }`}>
                          <div 
                            className={`text-sm ${message.role === 'user' ? 'text-primary-foreground' : 'text-foreground'} prose prose-sm max-w-none`}
                            dangerouslySetInnerHTML={{ 
                              __html: formatMessageContent(message.content) 
                            }}
                          />
                        </div>
                        <div className={`text-xs text-muted-foreground mt-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                          {message.timestamp.toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                      
                      {message.role === 'user' && (
                        <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                          {userData?.avatar_url ? (
                            <AvatarImage src={userData.avatar_url} alt={userData.nome || "Avatar do usuário"} />
                          ) : null}
                          <AvatarFallback className="bg-secondary">
                            {userData?.nome ? userData.nome.split(' ').map(n => n[0]).join('').substring(0, 2) : <User className="h-3 w-3 sm:h-4 sm:w-4" />}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                        <AvatarImage src="/lovable-uploads/04b4bc6e-c3c0-4f8e-9819-9f578ec4da19.png" alt="Assistente" />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <Separator />
            
            <div className="p-3 sm:p-4 flex-shrink-0">
              <div className="flex gap-2 sm:gap-3 items-end">
                <Textarea
                  placeholder={isMobile ? "Digite sua mensagem..." : "Digite sua mensagem... (Shift+Enter para quebra de linha)"}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1 min-h-[50px] sm:min-h-[60px] max-h-40 resize-none text-sm sm:text-base"
                  rows={isMobile ? 1 : 2}
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isLoading}
                  className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12"
                >
                  <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="flex-shrink-0 h-10 sm:h-12 px-3 sm:px-6"
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Enviar</span>
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground mt-2 text-center hidden sm:block">
                🔒 Integração segura • 🚀 Respostas em tempo real • 📊 Dados do sistema
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};