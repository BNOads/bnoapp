import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Copy, Archive, FlaskConical, Calendar, Target, Lightbulb, BarChart3, ExternalLink, FileText, MessageCircle, Play, CheckCircle2, RotateCcw, ThumbsUp, ThumbsDown, HelpCircle, Beaker } from 'lucide-react';
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
import { TesteHistorico } from './TesteHistorico';
import { EditarTesteModal } from './EditarTesteModal';
import { ConcluirTesteModal, type ConcluirTesteData } from './ConcluirTesteModal';
import type { TesteLaboratorio, TesteFormData, ValidacaoTesteLab } from '@/types/laboratorio-testes';
import { STATUS_LABELS, STATUS_COLORS, VALIDACAO_LABELS, VALIDACAO_COLORS, TIPO_LABELS, CANAL_LABELS, METRICA_LABELS } from '@/types/laboratorio-testes';
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

    // Toggle: if clicking the same, reset to em_teste
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
  const resultPercent = teste.meta_metrica && teste.resultado_observado
    ? Math.min(Math.round((teste.resultado_observado / teste.meta_metrica) * 100), 100)
    : null;
  const resultIsGood = teste.meta_metrica && teste.resultado_observado
    ? teste.resultado_observado >= teste.meta_metrica
    : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/laboratorio-testes')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Voltar ao Laboratório
      </Button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-100">
                    <FlaskConical className="h-6 w-6 text-violet-600" />
                  </div>
                  <h1 className="text-2xl font-bold">{teste.nome}</h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={STATUS_COLORS[teste.status]}>
                    {STATUS_LABELS[teste.status]}
                  </Badge>
                  <Separator orientation="vertical" className="h-5" />
                  <div className="flex items-center gap-1.5">
                    {([
                      { value: 'em_teste' as ValidacaoTesteLab, label: 'Em Teste', icon: Beaker, color: 'text-blue-600', bg: 'bg-blue-100 border-blue-300', activeBg: 'bg-blue-500 text-white border-blue-500' },
                      { value: 'deu_bom' as ValidacaoTesteLab, label: 'Deu Bom', icon: ThumbsUp, color: 'text-emerald-600', bg: 'bg-emerald-100 border-emerald-300', activeBg: 'bg-emerald-500 text-white border-emerald-500' },
                      { value: 'deu_ruim' as ValidacaoTesteLab, label: 'Deu Ruim', icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-100 border-red-300', activeBg: 'bg-red-500 text-white border-red-500' },
                      { value: 'inconclusivo' as ValidacaoTesteLab, label: 'Inconclusivo', icon: HelpCircle, color: 'text-orange-600', bg: 'bg-orange-100 border-orange-300', activeBg: 'bg-orange-500 text-white border-orange-500' },
                    ]).map(({ value, label, icon: Icon, color, bg, activeBg }) => {
                      const isActive = teste.validacao === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => canEdit && handleValidacaoChange(value)}
                          disabled={!canEdit}
                          title={canEdit ? (isActive ? `Desmarcar ${label}` : `Marcar como ${label}`) : label}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
                            isActive
                              ? activeBg
                              : `${bg} ${color} opacity-50 hover:opacity-100`
                          } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {teste.cliente?.nome && (
                    <span>Cliente: <strong className="text-foreground">{teste.cliente.nome}</strong></span>
                  )}
                  {teste.funil && (
                    <span>Funil: <strong className="text-foreground">{teste.funil}</strong></span>
                  )}
                  <span className="flex items-center gap-1">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px] bg-violet-100 text-violet-700">
                        {getInitials(teste.gestor?.nome)}
                      </AvatarFallback>
                    </Avatar>
                    {teste.gestor?.nome || 'Sem gestor'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(teste.created_at), 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {canEdit && teste.status === 'planejado' && (
                  <Button onClick={handleStartTeste} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Play className="h-4.5 w-4.5" />
                    Iniciar Teste
                  </Button>
                )}
                {canEdit && teste.status === 'rodando' && (
                  <Button onClick={handleConcludeTeste} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    Concluir Teste
                  </Button>
                )}
                {canEdit && (teste.status === 'concluido' || teste.status === 'cancelado') && (
                  <Button variant="outline" onClick={handleRedoTeste} className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                    <RotateCcw className="h-4.5 w-4.5" />
                    Refazer Teste
                  </Button>
                )}
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)} className="gap-1.5">
                    <Edit className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  Duplicar
                </Button>
                {canArchive && !teste.arquivado && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
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

      {/* Hipótese */}
      {(teste.hipotese || teste.o_que_foi_alterado) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Hipótese
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {teste.hipotese && (
                <p className="text-sm leading-relaxed">{teste.hipotese}</p>
              )}
              {teste.o_que_foi_alterado && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">O que foi alterado</p>
                  <p className="text-sm leading-relaxed">{teste.o_que_foi_alterado}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Configuração */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-violet-500" />
              Configuração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Tipo de Teste</p>
                <p className="text-sm font-medium">{TIPO_LABELS[teste.tipo_teste]}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Canal</p>
                <p className="text-sm font-medium">{CANAL_LABELS[teste.canal]}</p>
              </div>
              {teste.metrica_principal && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Métrica Principal</p>
                  <p className="text-sm font-medium">{METRICA_LABELS[teste.metrica_principal]}</p>
                </div>
              )}
              {teste.meta_metrica != null && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Meta</p>
                  <p className="text-sm font-medium">{teste.meta_metrica}</p>
                </div>
              )}
              {teste.data_inicio && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Data Início</p>
                  <p className="text-sm font-medium">{format(new Date(teste.data_inicio), 'dd/MM/yyyy')}</p>
                </div>
              )}
              {teste.data_fim && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Data Fim</p>
                  <p className="text-sm font-medium">{format(new Date(teste.data_fim), 'dd/MM/yyyy')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Resultados */}
      {(teste.resultado_observado != null || teste.meta_metrica != null) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Resultados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-6">
                {teste.resultado_observado != null && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Resultado Observado</p>
                    <p className={`text-2xl font-bold ${resultIsGood === true ? 'text-emerald-600' : resultIsGood === false ? 'text-red-600' : ''}`}>
                      {teste.resultado_observado}
                      {teste.metrica_principal && <span className="text-sm ml-1 font-normal text-muted-foreground">{METRICA_LABELS[teste.metrica_principal]}</span>}
                    </p>
                  </div>
                )}
                {teste.meta_metrica != null && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Meta</p>
                    <p className="text-2xl font-bold text-muted-foreground">{teste.meta_metrica}</p>
                  </div>
                )}
              </div>
              {resultPercent !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span>{resultPercent}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${resultIsGood ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${resultPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Evidências */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <TesteEvidencias testeId={id!} />
      </motion.div>

      {/* Aprendizados */}
      {(teste.aprendizados || teste.proximos_testes_sugeridos || teste.observacao_equipe || teste.anotacoes) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-emerald-500" />
                Aprendizados & Notas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {teste.aprendizados && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Aprendizados</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{teste.aprendizados}</p>
                </div>
              )}
              {teste.proximos_testes_sugeridos && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Próximos Testes Sugeridos</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{teste.proximos_testes_sugeridos}</p>
                </div>
              )}
              {teste.observacao_equipe && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Observação da Equipe</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{teste.observacao_equipe}</p>
                </div>
              )}
              {teste.anotacoes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Anotações</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{teste.anotacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Links */}
      {hasLinks && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ExternalLink className="h-5 w-5 text-blue-500" />
                Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teste.link_anuncio && (
                  <a href={teste.link_anuncio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Link do Anúncio
                  </a>
                )}
                {teste.link_campanha && (
                  <a href={teste.link_campanha} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Link da Campanha
                  </a>
                )}
                {teste.link_experimento && (
                  <a href={teste.link_experimento} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Link do Experimento
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Comentários */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <TesteComentarios testeId={id!} />
      </motion.div>

      {/* Histórico */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <TesteHistorico testeId={id!} />
      </motion.div>

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
