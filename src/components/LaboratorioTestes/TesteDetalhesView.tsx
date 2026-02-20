import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Copy, Archive, FlaskConical, Calendar, Target, Lightbulb, ExternalLink, FileText, Play, CheckCircle2, RotateCcw, ThumbsUp, ThumbsDown, HelpCircle, Beaker, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useTestePermissions } from '@/hooks/useTestePermissions';
import { useToast } from '@/hooks/use-toast';
import { TesteEvidencias } from './TesteEvidencias';
import { TesteComentarios } from './TesteComentarios';
import { EditarTesteModal } from './EditarTesteModal';
import { ConcluirTesteModal, type ConcluirTesteData } from './ConcluirTesteModal';
import type { TesteLaboratorio, TesteFormData, ValidacaoTesteLab } from '@/types/laboratorio-testes';
import { STATUS_LABELS, STATUS_COLORS, TIPO_LABELS, CANAL_LABELS, METRICA_LABELS } from '@/types/laboratorio-testes';
import { format } from 'date-fns';

export const TesteDetalhesView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEditAll, canEditOwn, canArchive, currentUserId, currentColaboradorId } = useTestePermissions();

  const [teste, setTeste] = useState<TesteLaboratorio | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConcludeModal, setShowConcludeModal] = useState(false);

  const fetchTeste = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('testes_laboratorio')
      .select(`
        *,
        cliente:clientes!cliente_id(id, nome),
        gestor:gestor_responsavel_id(id, user_id, nome, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao carregar teste:', error);
      toast({ title: 'Erro', description: 'Teste não encontrado', variant: 'destructive' });
      navigate('/laboratorio-testes');
      return;
    }
    setTeste(data as TesteLaboratorio);
    setLoading(false);
  }, [id, navigate, toast]);

  useEffect(() => { fetchTeste(); }, [fetchTeste]);

  const canEdit = canEditAll || (canEditOwn && teste?.gestor?.user_id === currentUserId);

  const handleArchive = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('testes_laboratorio').update({ arquivado: true }).eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao arquivar teste', variant: 'destructive' });
      return;
    }
    await supabase.from('testes_laboratorio_audit_log').insert({
      teste_id: id, acao: 'arquivado', user_id: user.id,
    });
    toast({ title: 'Teste arquivado com sucesso!' });
    navigate('/laboratorio-testes');
  };

  const handleUpdateTeste = async (testeId: string, formData: Partial<TesteFormData>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const updateData: any = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (value === undefined) return;
      if (key === 'meta_metrica' || key === 'resultado_observado') {
        updateData[key] = value ? parseFloat(value as string) : null;
      } else {
        updateData[key] = value === '' ? null : value;
      }
    });

    const { error } = await supabase.from('testes_laboratorio').update(updateData).eq('id', testeId);
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao atualizar teste: ' + error.message, variant: 'destructive' });
      return false;
    }

    await supabase.from('testes_laboratorio_audit_log').insert({
      teste_id: testeId, acao: 'editado', user_id: user.id,
    });

    toast({ title: 'Teste atualizado com sucesso!' });
    await fetchTeste();
    return true;
  };

  const handleStartTeste = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('testes_laboratorio').update({
      status: 'rodando',
      data_inicio: new Date().toISOString().split('T')[0],
    }).eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao iniciar teste', variant: 'destructive' });
      return;
    }
    toast({ title: 'Teste iniciado!' });
    await fetchTeste();
  };

  const handleConcludeTeste = () => {
    setShowConcludeModal(true);
  };

  const handleConfirmConclude = async (data: ConcluirTesteData) => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('testes_laboratorio').update({
      status: 'concluido',
      data_fim: new Date().toISOString().split('T')[0],
      validacao: data.validacao,
      resultado_observado: data.resultado_observado ? parseFloat(data.resultado_observado) : null,
      aprendizados: data.aprendizados || null,
    }).eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao concluir teste', variant: 'destructive' });
      return;
    }

    await supabase.from('testes_laboratorio_comentarios').insert({
      teste_id: id,
      autor_user_id: user.id,
      comentario: `[Conclusao do teste] ${data.comentario}`,
    });

    await supabase.from('testes_laboratorio_audit_log').insert({
      teste_id: id,
      acao: 'concluido',
      campo_alterado: 'status',
      valor_anterior: 'rodando',
      valor_novo: 'concluido',
      user_id: user.id,
    });

    toast({ title: 'Teste concluido!' });
    setShowConcludeModal(false);
    await fetchTeste();
  };

  const handleRedoTeste = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('testes_laboratorio').update({
      status: 'rodando',
      data_fim: null,
      validacao: 'em_teste',
    }).eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao refazer teste', variant: 'destructive' });
      return;
    }
    await supabase.from('testes_laboratorio_audit_log').insert({
      teste_id: id,
      acao: 'refeito',
      campo_alterado: 'status',
      valor_anterior: teste?.status || 'concluido',
      valor_novo: 'rodando',
      user_id: user.id,
    });
    toast({ title: 'Teste reaberto!' });
    await fetchTeste();
  };

  const handleValidacaoChange = async (newValidacao: ValidacaoTesteLab) => {
    if (!id || !teste) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const finalValidacao = teste.validacao === newValidacao ? 'em_teste' : newValidacao;

    const { error } = await supabase.from('testes_laboratorio').update({
      validacao: finalValidacao,
    }).eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao atualizar validacao', variant: 'destructive' });
      return;
    }

    await supabase.from('testes_laboratorio_audit_log').insert({
      teste_id: id,
      acao: 'validacao_alterada',
      campo_alterado: 'validacao',
      valor_anterior: teste.validacao,
      valor_novo: finalValidacao,
      user_id: user.id,
    });

    await fetchTeste();
  };

  const handleDuplicate = async () => {
    if (!teste || !id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from('testes_laboratorio').insert({
      cliente_id: teste.cliente_id || null,
      funil: teste.funil || null,
      nome: `${teste.nome} (cópia)`,
      gestor_responsavel_id: currentColaboradorId || null,
      tipo_teste: teste.tipo_teste,
      canal: teste.canal,
      status: 'planejado' as const,
      metrica_principal: teste.metrica_principal || null,
      meta_metrica: teste.meta_metrica || null,
      hipotese: teste.hipotese || null,
      o_que_foi_alterado: teste.o_que_foi_alterado || null,
      created_by: user.id,
    }).select('id').single();

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao duplicar teste', variant: 'destructive' });
      return;
    }

    await supabase.from('testes_laboratorio_audit_log').insert({
      teste_id: data.id, acao: 'criado', user_id: user.id,
    });

    toast({ title: 'Teste duplicado com sucesso!' });
    navigate(`/laboratorio-testes/${data.id}`);
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!teste) return null;

  const hasLinks = teste.link_anuncio || teste.link_campanha || teste.link_experimento;

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/laboratorio-testes')} className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Voltar ao Laboratório
      </Button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="overflow-hidden border-border/60 shadow-md relative bg-background/50 backdrop-blur-[2px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-500" />
          <CardContent className="pt-8 pb-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 shadow-sm">
                    <FlaskConical className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground/90">{teste.nome}</h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`${STATUS_COLORS[teste.status]} shadow-sm`}>
                    {STATUS_LABELS[teste.status]}
                  </Badge>
                  <Separator orientation="vertical" className="h-5 bg-border/60" />
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/50">
                    {([
                      { value: 'em_teste' as ValidacaoTesteLab, label: 'Em Teste', icon: Beaker, color: 'text-blue-600', bg: 'bg-blue-100/50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border-transparent hover:border-blue-300', activeBg: 'bg-blue-500 text-white border-blue-600 shadow-sm' },
                      { value: 'deu_bom' as ValidacaoTesteLab, label: 'Deu Bom', icon: ThumbsUp, color: 'text-emerald-600', bg: 'bg-emerald-100/50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 border-transparent hover:border-emerald-300', activeBg: 'bg-emerald-500 text-white border-emerald-600 shadow-sm' },
                      { value: 'deu_ruim' as ValidacaoTesteLab, label: 'Deu Ruim', icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-100/50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 border-transparent hover:border-red-300', activeBg: 'bg-red-500 text-white border-red-600 shadow-sm' },
                      { value: 'inconclusivo' as ValidacaoTesteLab, label: 'Inconclusivo', icon: HelpCircle, color: 'text-orange-600', bg: 'bg-orange-100/50 hover:bg-orange-100 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 border-transparent hover:border-orange-300', activeBg: 'bg-orange-500 text-white border-orange-600 shadow-sm' },
                    ]).map(({ value, label, icon: Icon, color, bg, activeBg }) => {
                      const isActive = teste.validacao === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => canEdit && handleValidacaoChange(value)}
                          disabled={!canEdit}
                          title={canEdit ? (isActive ? `Desmarcar ${label}` : `Marcar como ${label}`) : label}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-all duration-200 ${isActive
                            ? activeBg
                            : `${bg} ${color} dark:text-foreground opacity-70 hover:opacity-100`
                            } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground/80 font-medium">
                  {teste.cliente?.nome && (
                    <span className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5 rounded bg-muted">
                        <AvatarFallback className="text-[9px] rounded font-bold uppercase">{getInitials(teste.cliente.nome)}</AvatarFallback>
                      </Avatar>
                      <strong className="text-foreground tracking-tight">{teste.cliente.nome}</strong>
                    </span>
                  )}
                  {teste.funil && (
                    <span className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      Funil: <strong className="text-foreground tracking-tight">{teste.funil}</strong>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px] bg-violet-100 text-violet-700 font-bold uppercase">
                        {getInitials(teste.gestor?.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-foreground tracking-tight">{teste.gestor?.nome || 'Sem gestor'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(teste.created_at), 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canEdit && teste.status === 'planejado' && (
                  <Button onClick={handleStartTeste} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                    <Play className="h-4.5 w-4.5" />
                    Iniciar Teste
                  </Button>
                )}
                {canEdit && teste.status === 'rodando' && (
                  <Button onClick={handleConcludeTeste} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    Concluir Teste
                  </Button>
                )}
                {canEdit && (teste.status === 'concluido' || teste.status === 'cancelado') && (
                  <Button variant="outline" onClick={handleRedoTeste} className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-200">
                    <RotateCcw className="h-4 w-4" />
                    Refazer Teste
                  </Button>
                )}
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)} className="gap-1.5 border-border shadow-sm">
                    <Edit className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-1.5 border-border shadow-sm">
                  <Copy className="h-3.5 w-3.5" />
                  Duplicar
                </Button>
                {canArchive && !teste.arquivado && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20 shadow-sm">
                        <Archive className="h-3.5 w-3.5" />
                        Arquivar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Arquivar teste?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O teste será arquivado e não aparecerá mais na listagem padrão. Esta ação pode ser revertida por um administrador.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchive} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Arquivar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main content) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hipótese */}
          {(teste.hipotese || teste.o_que_foi_alterado) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-amber-500/5 border-b border-amber-100/50 pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-amber-700 dark:text-amber-500">
                    <Lightbulb className="h-5 w-5" />
                    Hipótese
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {teste.hipotese && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-[15px] leading-relaxed text-foreground/90">{teste.hipotese}</p>
                    </div>
                  )}
                  {teste.o_que_foi_alterado && (
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                      <p className="text-xs font-bold tracking-[0.1em] text-amber-800/60 dark:text-amber-400/60 uppercase mb-3">O que foi alterado</p>
                      <p className="text-sm leading-relaxed text-foreground/80">{teste.o_que_foi_alterado}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Evidências */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <TesteEvidencias testeId={id!} />
          </motion.div>

          {/* Aprendizados */}
          {(teste.aprendizados || teste.proximos_testes_sugeridos || teste.observacao_equipe || teste.anotacoes) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-emerald-500/5 border-b border-emerald-100/50 pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-emerald-700 dark:text-emerald-500">
                    <FileText className="h-5 w-5" />
                    Aprendizados & Notas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {teste.aprendizados && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      <p className="text-xs font-bold tracking-[0.1em] text-emerald-800/60 dark:text-emerald-400/60 uppercase mb-3">Aprendizados</p>
                      <p className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap">{teste.aprendizados}</p>
                    </div>
                  )}
                  {teste.proximos_testes_sugeridos && (
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      <p className="text-xs font-bold tracking-[0.1em] text-blue-800/60 dark:text-blue-400/60 uppercase mb-3">Próximos Testes Sugeridos</p>
                      <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{teste.proximos_testes_sugeridos}</p>
                    </div>
                  )}
                  {teste.observacao_equipe && (
                    <div>
                      <p className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase mb-2">Observação da Equipe</p>
                      <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap pl-3 border-l-2 border-border/60">{teste.observacao_equipe}</p>
                    </div>
                  )}
                  {teste.anotacoes && (
                    <div>
                      <p className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase mb-2">Anotações</p>
                      <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap pl-3 border-l-2 border-border/60">{teste.anotacoes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

        </div>

        {/* Right Column (Sidebar) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Comentários */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <TesteComentarios testeId={id!} />
          </motion.div>

          {/* Configuração */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border/50 shadow-sm overflow-hidden bg-muted/10">
              <CardHeader className="pb-4 bg-muted/30 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Target className="h-4 w-4 text-violet-500" />
                  Configuração
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-2 px-5">
                <div className="flex flex-col">
                  <div className="flex justify-between items-center py-3 border-b border-border/60 last:border-0">
                    <span className="text-xs font-medium text-muted-foreground">Tipo de Teste</span>
                    <span className="text-sm font-semibold">{TIPO_LABELS[teste.tipo_teste]}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border/60 last:border-0">
                    <span className="text-xs font-medium text-muted-foreground">Canal</span>
                    <span className="text-sm font-semibold">{CANAL_LABELS[teste.canal]}</span>
                  </div>
                  {teste.metrica_principal && (
                    <div className="flex justify-between items-center py-3 border-b border-border/60 last:border-0">
                      <span className="text-xs font-medium text-muted-foreground">Métrica Principal</span>
                      <span className="text-sm font-semibold">{METRICA_LABELS[teste.metrica_principal]}</span>
                    </div>
                  )}
                  {teste.meta_metrica != null && (
                    <div className="flex justify-between items-center py-3 border-b border-border/60 last:border-0">
                      <span className="text-xs font-medium text-muted-foreground">Meta</span>
                      <span className="text-sm font-semibold">{teste.meta_metrica}</span>
                    </div>
                  )}
                  {teste.data_inicio && (
                    <div className="flex justify-between items-center py-3 border-b border-border/60 last:border-0">
                      <span className="text-xs font-medium text-muted-foreground">Data Início</span>
                      <span className="text-sm font-semibold text-foreground/90">{format(new Date(teste.data_inicio), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                  {teste.data_fim && (
                    <div className="flex justify-between items-center py-3 border-b border-border/60 last:border-0">
                      <span className="text-xs font-medium text-muted-foreground">Data Fim</span>
                      <span className="text-sm font-semibold text-foreground/90">{format(new Date(teste.data_fim), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Links */}
          {hasLinks && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="pb-4 bg-muted/20 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <ExternalLink className="h-4 w-4 text-blue-500" />
                    Links Externos
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-3">
                    {teste.link_anuncio && (
                      <a href={teste.link_anuncio} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/50 hover:border-blue-200 transition-all">
                        <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">Anúncio</span>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-500" />
                      </a>
                    )}
                    {teste.link_campanha && (
                      <a href={teste.link_campanha} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/50 hover:border-blue-200 transition-all">
                        <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">Campanha</span>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-500" />
                      </a>
                    )}
                    {teste.link_experimento && (
                      <a href={teste.link_experimento} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/50 hover:border-blue-200 transition-all">
                        <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">Experimento</span>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-500" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {teste && (
        <EditarTesteModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          teste={teste}
          onSuccess={fetchTeste}
          updateTeste={handleUpdateTeste}
        />
      )}

      {/* Conclude Modal */}
      <ConcluirTesteModal
        open={showConcludeModal}
        onOpenChange={setShowConcludeModal}
        onConfirm={handleConfirmConclude}
        testeName={teste?.nome || ''}
      />
    </div>
  );
};
