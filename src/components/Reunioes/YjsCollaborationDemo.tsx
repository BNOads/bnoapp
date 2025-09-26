import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QuillCollaborativeEditor } from './QuillCollaborativeEditor';
import { Info, Users, Wifi, WifiOff } from 'lucide-react';

interface YjsDemo {
  currentDocument: { id: string };
  userData: any;
  permissions: { canCreateContent: boolean; isAdmin: boolean };
}

export function YjsCollaborationDemo({
  currentDocument,
  userData,
  permissions
}: YjsDemo) {
  const [demoContent, setDemoContent] = useState(`
    <h2>Demonstração do Editor Colaborativo Quill + Yjs</h2>
    <p>Este é um editor colaborativo em tempo real usando <strong>Quill</strong> e <strong>Yjs</strong>.</p>
    
    <h2>Funcionalidades Implementadas</h2>
    <ul>
      <li>✅ Editor Quill com toolbar básica</li>
      <li>✅ Colaboração em tempo real via Yjs</li>
      <li>✅ Indicadores de presença (avatares, cursores)</li>
      <li>✅ Status "digitando..."</li>
      <li>✅ Autosave a cada 3 segundos</li>
      <li>✅ Checkpoints automáticos (5 min/1000 ops)</li>
      <li>✅ Sistema de permissões</li>
      <li>✅ Resiliência e reconexão</li>
    </ul>

    <h2>Como Testar</h2>
    <p>Para testar a colaboração em tempo real:</p>
    <ol>
      <li>Abra esta página em <strong>duas abas diferentes</strong></li>
      <li>Digite em uma aba e veja as mudanças aparecerem na outra</li>
      <li>Observe os indicadores de presença no topo</li>
      <li>Note o status "Salvando..." / "✔ Salvo"</li>
    </ol>

    <h2>Tecnologias Utilizadas</h2>
    <ul>
      <li><strong>Quill</strong> - Editor WYSIWYG rico</li>
      <li><strong>Yjs</strong> - Framework de colaboração em tempo real</li>
      <li><strong>y-quill</strong> - Binding entre Quill e Yjs</li>
      <li><strong>y-websocket</strong> - Provider WebSocket para Yjs</li>
      <li><strong>Supabase</strong> - Armazenamento de checkpoints</li>
    </ul>
  `);

  const [isConnected, setIsConnected] = useState(false);

  const handleContentChange = (content: string) => {
    setDemoContent(content);
    console.log('Content changed in demo:', content.substring(0, 100) + '...');
  };

  if (!currentDocument) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Selecione ou crie um documento de pauta para testar a colaboração.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Colaboração em Tempo Real - Quill + Yjs
            <Badge variant="secondary" className="flex items-center gap-1">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Conectado
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Modo Local
                </>
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Status:</strong> Editor funcionando em modo local. 
              Para colaboração completa, configure um servidor Yjs WebSocket.
              {userData && (
                <span className="block mt-1">
                  Usuário: <strong>{userData.nome}</strong> | 
                  Permissão: <strong>{permissions.canCreateContent ? 'Editor' : 'Visualizador'}</strong>
                </span>
              )}
            </AlertDescription>
          </Alert>

          <QuillCollaborativeEditor
            documentId={currentDocument.id}
            blockId="demo-block"
            content={demoContent}
            onChange={handleContentChange}
            placeholder="Digite aqui para testar a colaboração..."
            className="min-h-[400px]"
            permissions={{
              canEdit: permissions.canCreateContent || permissions.isAdmin,
              canView: true
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Critérios de Aceite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm">✅ Implementado:</h4>
              <ul className="text-sm space-y-1 mt-1">
                <li>• Editor Quill com toolbar</li>
                <li>• Sistema de presença</li>
                <li>• Indicadores de digitação</li>
                <li>• Autosave automático</li>
                <li>• Checkpoints histórico</li>
                <li>• Permissões editor/visualizador</li>
                <li>• Interface de status</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm">📋 Para produção:</h4>
              <ul className="text-sm space-y-1 mt-1">
                <li>• Servidor Yjs WebSocket</li>
                <li>• Testes de latência ≤300ms</li>
                <li>• Testes de perda de conteúdo</li>
                <li>• Monitoramento de desempenho</li>
                <li>• Configuração de ambiente</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}