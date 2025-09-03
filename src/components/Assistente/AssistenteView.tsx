import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bot, User, Send, Mic, MessageSquare, Plus, Search, History, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
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
  const [showHistory, setShowHistory] = useState(true); // Começar com histórico visível
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { userData } = useCurrentUser();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadConversations();
    setShowHistory(true); // Mostrar histórico automaticamente
  }, []);

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
      // Não fechar o histórico
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

      // Chamar API do assistente
      const { data, error } = await supabase.functions.invoke('assistente-chat', {
        body: { message: userMessage }
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
    // Não fechar o histórico automaticamente
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

  const filteredConversations = conversations.filter(conv =>
    conv.titulo.toLowerCase().includes(searchQuery.toLowerCase())
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
      {/* Sidebar de Histórico */}
      {showHistory && (
        <div className="w-80 border-r border-border bg-card">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowHistory(false)}
              >
                <X className="h-4 w-4" />
              </Button>
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
                  className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                    currentConversationId === conversation.id
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => loadConversation(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {conversation.titulo || 'Conversa sem título'}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(conversation.updated_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {conversation.message_count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Chat Principal */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 border-0 rounded-none">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                Assistente BNOads
                <Badge variant="secondary" className="text-xs">
                  IA Integrada
                </Badge>
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Histórico
                </Button>
                
                {currentConversationId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startNewChat}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nova
                  </Button>
                )}
              </div>
            </div>
            
            {!messages.length && (
              <div className="text-sm text-muted-foreground">
                💡 <strong>Agora integrado!</strong> Posso consultar seus painéis, referências, aulas e dados do sistema
              </div>
            )}
          </CardHeader>

          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[calc(100vh-180px)] p-4">{/* Reduzido de 240px para 180px */}
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
                    <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
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
                      
                      <div className={`max-w-[85%] ${message.role === 'user' ? 'order-1' : ''}`}>
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
            
            <div className="p-3">{/* Reduzido padding de 4 para 3 */}
              <div className="flex gap-2 items-end">
                <Textarea
                  placeholder="Digite sua mensagem... (Shift+Enter para quebra de linha)"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1 min-h-[44px] max-h-32 resize-none"
                  rows={1}
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isLoading}
                  className="flex-shrink-0"
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground mt-2 text-center">
                🔒 Integração segura • 🚀 Respostas em tempo real • 📊 Dados do sistema
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};