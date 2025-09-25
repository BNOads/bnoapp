import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import TrafficMetrics from './TrafficMetrics';

interface DadosBrutosAnalysisProps {
  debriefingId: string;
  dados_leads: any[];
  dados_compradores: any[];
  dados_trafego: any[];
  dados_pesquisa: any[];
  dados_outras_fontes: any[];
}

export function DadosBrutosAnalysis({
  debriefingId,
  dados_leads,
  dados_compradores,
  dados_trafego,
  dados_pesquisa,
  dados_outras_fontes
}: DadosBrutosAnalysisProps) {
  // Função para normalizar emails
  const normalizeEmail = (email: string) => {
    return email?.toLowerCase().trim() || '';
  };

  // Criar sets de emails para cruzamento
  const emailsLeads = new Set(dados_leads.map(lead => normalizeEmail(lead.email)));
  const emailsCompradores = new Set(dados_compradores.map(comprador => normalizeEmail(comprador.email)));
  const emailsPesquisa = new Set(dados_pesquisa.map(resposta => normalizeEmail(resposta.email)));

  // Calcular intersecções
  const leadsQueCompraram = [...emailsLeads].filter(email => emailsCompradores.has(email));
  const leadsQueResponderamPesquisa = [...emailsLeads].filter(email => emailsPesquisa.has(email));
  const compradoresQueResponderamPesquisa = [...emailsCompradores].filter(email => emailsPesquisa.has(email));

  // Calcular taxas de conversão
  const taxaConversaoGeral = emailsLeads.size > 0 ? (leadsQueCompraram.length / emailsLeads.size) * 100 : 0;
  const taxaRespostaPesquisa = emailsLeads.size > 0 ? (leadsQueResponderamPesquisa.length / emailsLeads.size) * 100 : 0;
  const taxaConversaoPesquisa = leadsQueResponderamPesquisa.length > 0 ? (compradoresQueResponderamPesquisa.length / leadsQueResponderamPesquisa.length) * 100 : 0;

  // Análise por criativo
  const analiseCreativos = () => {
    const creativoStats: Record<string, {
      leads: number;
      vendas: number;
      investimento: number;
      emails: Set<string>;
      conversao: number;
    }> = {};
    
    dados_trafego.forEach(registro => {
      const criativo = registro.criativo || registro.creative_name || registro.nome_criativo || 'Não informado';
      if (!creativoStats[criativo]) {
        creativoStats[criativo] = {
          leads: 0,
          vendas: 0,
          investimento: 0,
          emails: new Set(),
          conversao: 0
        };
      }
      creativoStats[criativo].leads += parseInt(registro.leads || 0);
      creativoStats[criativo].investimento += parseFloat(registro.investimento || registro.spend || 0);
      
      // Tentar mapear emails para criativos (se disponível)
      if (registro.email) {
        creativoStats[criativo].emails.add(normalizeEmail(registro.email));
      }
    });

    // Calcular vendas por criativo baseado nos emails
    Object.keys(creativoStats).forEach(criativo => {
      const emailsCreativo = creativoStats[criativo].emails;
      creativoStats[criativo].vendas = [...emailsCreativo].filter(email => emailsCompradores.has(email)).length;
      creativoStats[criativo].conversao = creativoStats[criativo].leads > 0 ? 
        (creativoStats[criativo].vendas / creativoStats[criativo].leads) * 100 : 0;
    });

    return Object.entries(creativoStats)
      .filter(([_, stats]) => stats.leads > 0)
      .sort((a, b) => b[1].conversao - a[1].conversao)
      .slice(0, 10);
  };

  // Análise por respostas da pesquisa
  const analisePesquisa = () => {
    const respostaStats: Record<string, Record<string, {
      total: number;
      compraram: number;
      emails: Set<string>;
      conversao: number;
    }>> = {};
    
    dados_pesquisa.forEach(resposta => {
      Object.keys(resposta).forEach(campo => {
        // Filtrar campos que não devem aparecer na análise
        if (campo === 'email' || 
            campo === 'nome' || 
            campo === 'telefone' || 
            campo.toLowerCase().includes('nome') || 
            campo.toLowerCase().includes('telefone') ||
            campo.toLowerCase().includes('email')) return;
        
        const valor = resposta[campo];
        if (!valor) return;

        if (!respostaStats[campo]) {
          respostaStats[campo] = {};
        }
        
        if (!respostaStats[campo][valor]) {
          respostaStats[campo][valor] = {
            total: 0,
            compraram: 0,
            emails: new Set(),
            conversao: 0
          };
        }
        
        respostaStats[campo][valor].total++;
        respostaStats[campo][valor].emails.add(normalizeEmail(resposta.email));
        
        if (emailsCompradores.has(normalizeEmail(resposta.email))) {
          respostaStats[campo][valor].compraram++;
        }
      });
    });

    // Calcular taxa de conversão por resposta
    Object.keys(respostaStats).forEach(campo => {
      Object.keys(respostaStats[campo]).forEach(valor => {
        const stats = respostaStats[campo][valor];
        stats.conversao = stats.total > 0 ? (stats.compraram / stats.total) * 100 : 0;
      });
    });

    return respostaStats;
  };

  // Análise por UTM Terms (Orgânico vs Pago)
  const analiseUTMTerms = () => {
    const utmStats: Record<string, {
      leads: number;
      vendas: number;
      conversao: number;
      emails: Set<string>;
      tipo: 'organico' | 'pago';
    }> = {};

    // Analisar leads por UTM term
    dados_leads.forEach(lead => {
      const utmTerm = lead.utm_term || lead.utmTerm || 'não informado';
      const email = normalizeEmail(lead.email);
      
      if (!utmStats[utmTerm]) {
        utmStats[utmTerm] = {
          leads: 0,
          vendas: 0,
          conversao: 0,
          emails: new Set(),
          tipo: utmTerm.toLowerCase().includes('organico') ? 'organico' : 'pago'
        };
      }
      
      utmStats[utmTerm].leads++;
      utmStats[utmTerm].emails.add(email);
      
      if (emailsCompradores.has(email)) {
        utmStats[utmTerm].vendas++;
      }
    });

    // Calcular conversões
    Object.keys(utmStats).forEach(term => {
      utmStats[term].conversao = utmStats[term].leads > 0 ? 
        (utmStats[term].vendas / utmStats[term].leads) * 100 : 0;
    });

    return utmStats;
  };

  // Análise por fontes de tráfego
  const analiseFontesTrafego = () => {
    const fontesOrganicas: Record<string, { leads: number; vendas: number; conversao: number }> = {};
    const fontesPagas: Record<string, { leads: number; vendas: number; conversao: number }> = {};

    dados_leads.forEach(lead => {
      const utmSource = lead.utm_source || lead.utmSource || 'não informado';
      const utmTerm = lead.utm_term || lead.utmTerm || '';
      const email = normalizeEmail(lead.email);
      const isOrganico = utmTerm.toLowerCase().includes('organico');
      
      const fontes = isOrganico ? fontesOrganicas : fontesPagas;
      
      if (!fontes[utmSource]) {
        fontes[utmSource] = { leads: 0, vendas: 0, conversao: 0 };
      }
      
      fontes[utmSource].leads++;
      
      if (emailsCompradores.has(email)) {
        fontes[utmSource].vendas++;
      }
    });

    // Calcular conversões
    [fontesOrganicas, fontesPagas].forEach(fontes => {
      Object.keys(fontes).forEach(fonte => {
        fontes[fonte].conversao = fontes[fonte].leads > 0 ? 
          (fontes[fonte].vendas / fontes[fonte].leads) * 100 : 0;
      });
    });

    return { fontesOrganicas, fontesPagas };
  };

  const creativosAnalise = analiseCreativos();
  const pesquisaAnalise = analisePesquisa();
  const utmAnalise = analiseUTMTerms();
  const { fontesOrganicas, fontesPagas } = analiseFontesTrafego();

  return (
    <div className="space-y-6">
      {/* Resumo de Tráfego */}
      <TrafficMetrics 
        debriefingId={debriefingId}
        dadosTrafego={dados_trafego}
      />
      
      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Leads:</span>
                <Badge variant="secondary">{dados_leads.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Vendas:</span>
                <Badge variant="secondary">{dados_compradores.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pesquisa:</span>
                <Badge variant="secondary">{dados_pesquisa.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tráfego:</span>
                <Badge variant="secondary">{dados_trafego.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cruzamento de Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Leads únicos:</span>
                <Badge>{emailsLeads.size}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Leads que compraram:</span>
                <Badge variant="default">{leadsQueCompraram.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Responderam pesquisa:</span>
                <Badge variant="outline">{leadsQueResponderamPesquisa.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Compraram + Pesquisa:</span>
                <Badge variant="destructive">{compradoresQueResponderamPesquisa.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Conversão Geral</span>
                  <span>{taxaConversaoGeral.toFixed(1)}%</span>
                </div>
                <Progress value={taxaConversaoGeral} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Resp. Pesquisa</span>
                  <span>{taxaRespostaPesquisa.toFixed(1)}%</span>
                </div>
                <Progress value={taxaRespostaPesquisa} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Qualidade dos Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Taxa Resp. Pesquisa:</span>
                <Badge variant={taxaRespostaPesquisa > 20 ? "default" : "destructive"}>
                  {taxaRespostaPesquisa.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Conv. c/ Pesquisa:</span>
                <Badge variant={taxaConversaoPesquisa > taxaConversaoGeral ? "default" : "secondary"}>
                  {taxaConversaoPesquisa.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análise por Criativo */}
      {creativosAnalise.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance por Criativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {creativosAnalise.map(([criativo, stats], index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">{criativo}</h4>
                    <Badge variant={stats.conversao > taxaConversaoGeral ? "default" : "secondary"}>
                      {stats.conversao.toFixed(1)}% conv.
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Leads:</span>
                      <p className="font-medium">{stats.leads}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vendas:</span>
                      <p className="font-medium">{stats.vendas}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Investimento:</span>
                      <p className="font-medium">R$ {stats.investimento.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Análise de UTM Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversão por UTM Term</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(utmAnalise)
                .sort((a, b) => b[1].conversao - a[1].conversao)
                .slice(0, 10)
                .map(([term, stats]) => (
                  <div key={term} className="border rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{term}</span>
                        <Badge variant={stats.tipo === 'organico' ? 'default' : 'secondary'}>
                          {stats.tipo}
                        </Badge>
                      </div>
                      <Badge variant={stats.conversao > taxaConversaoGeral ? "default" : "outline"}>
                        {stats.conversao.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                      <span>Leads: {stats.leads}</span>
                      <span>Vendas: {stats.vendas}</span>
                    </div>
                    <Progress value={stats.conversao} className="h-1 mt-2" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Orgânico vs Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const organicos = Object.values(utmAnalise).filter(s => s.tipo === 'organico');
                const pagos = Object.values(utmAnalise).filter(s => s.tipo === 'pago');
                
                const totalLeadsOrganicos = organicos.reduce((sum, s) => sum + s.leads, 0);
                const totalVendasOrganicas = organicos.reduce((sum, s) => sum + s.vendas, 0);
                const totalLeadsPagos = pagos.reduce((sum, s) => sum + s.leads, 0);
                const totalVendasPagas = pagos.reduce((sum, s) => sum + s.vendas, 0);
                
                const convOrganico = totalLeadsOrganicos > 0 ? (totalVendasOrganicas / totalLeadsOrganicos) * 100 : 0;
                const convPago = totalLeadsPagos > 0 ? (totalVendasPagas / totalLeadsPagos) * 100 : 0;

                return (
                  <>
                    <div className="border rounded p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-green-600">Tráfego Orgânico</h4>
                        <Badge variant="default">{convOrganico.toFixed(1)}%</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span>Leads: {totalLeadsOrganicos}</span>
                        <span>Vendas: {totalVendasOrganicas}</span>
                      </div>
                      <Progress value={convOrganico} className="h-2 mt-2" />
                    </div>

                    <div className="border rounded p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-blue-600">Tráfego Pago</h4>
                        <Badge variant="secondary">{convPago.toFixed(1)}%</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span>Leads: {totalLeadsPagos}</span>
                        <span>Vendas: {totalVendasPagas}</span>
                      </div>
                      <Progress value={convPago} className="h-2 mt-2" />
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Melhores Fontes por Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.keys(fontesOrganicas).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Melhores Fontes Orgânicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(fontesOrganicas)
                  .sort((a, b) => b[1].conversao - a[1].conversao)
                  .slice(0, 8)
                  .map(([fonte, stats]) => (
                    <div key={fonte} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">{fonte}</span>
                        <Badge variant={stats.conversao > taxaConversaoGeral ? "default" : "outline"}>
                          {stats.conversao.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>Leads: {stats.leads}</span>
                        <span>Vendas: {stats.vendas}</span>
                      </div>
                      <Progress value={stats.conversao} className="h-1 mt-2" />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {Object.keys(fontesPagas).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600">Melhores Fontes Pagas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(fontesPagas)
                  .sort((a, b) => b[1].conversao - a[1].conversao)
                  .slice(0, 8)
                  .map(([fonte, stats]) => (
                    <div key={fonte} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">{fonte}</span>
                        <Badge variant={stats.conversao > taxaConversaoGeral ? "default" : "outline"}>
                          {stats.conversao.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>Leads: {stats.leads}</span>
                        <span>Vendas: {stats.vendas}</span>
                      </div>
                      <Progress value={stats.conversao} className="h-1 mt-2" />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top 5 Anúncios (cruzamento leads com anúncios) */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Anúncios (Cruzamento Leads x Anúncios)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Anúncios com mais leads baseado no cruzamento entre planilha de leads e anúncios
          </p>
        </CardHeader>
        <CardContent>
          {(() => {
            // Criar mapa de anúncios do dados_trafego
            const anunciosMap: { [key: string]: any } = {};
            dados_trafego.forEach((anuncio: any) => {
              const nome = anuncio.nome_criativo || anuncio.creative_name || anuncio.criativo;
              if (nome) {
                anunciosMap[nome] = anuncio;
              }
            });

            // Analisar leads por content/anúncio
            const anunciosStats: { [key: string]: { 
              nome: string; 
              link: string; 
              leads: number; 
              conversions: number; 
              rate: number; 
            } } = {};

            dados_leads.forEach((lead: any) => {
              const content = lead.content || lead.utm_content || '';
              if (content) {
                // Procurar anúncio correspondente
                const anuncio = anunciosMap[content] || 
                               Object.values(anunciosMap).find((a: any) => 
                                 a.nome_criativo && content.includes(a.nome_criativo)
                               ) ||
                               Object.values(anunciosMap).find((a: any) => 
                                 a.creative_name && content.includes(a.creative_name)
                               );

                if (anuncio) {
                  const nomeAnuncio = anuncio.nome_criativo || anuncio.creative_name || anuncio.criativo;
                  if (!anunciosStats[nomeAnuncio]) {
                    anunciosStats[nomeAnuncio] = {
                      nome: nomeAnuncio,
                      link: anuncio.link_criativo || anuncio.creative_url || '',
                      leads: 0,
                      conversions: 0,
                      rate: 0
                    };
                  }
                  anunciosStats[nomeAnuncio].leads++;
                  
                  if (emailsCompradores.has(normalizeEmail(lead.email))) {
                    anunciosStats[nomeAnuncio].conversions++;
                  }
                }
              }
            });

            // Calcular taxa de conversão e ordenar
            const topAnuncios = Object.values(anunciosStats)
              .map(stats => ({
                ...stats,
                rate: stats.leads > 0 ? (stats.conversions / stats.leads) * 100 : 0
              }))
              .sort((a, b) => b.leads - a.leads)
              .slice(0, 5);

            return (
              <div className="space-y-3">
                {topAnuncios.map((anuncio, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{anuncio.nome}</p>
                        {anuncio.link && (
                          <a 
                            href={anuncio.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline truncate block mt-1"
                          >
                            Ver anúncio
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge variant="default">{anuncio.leads} leads</Badge>
                        <Badge variant="secondary">{anuncio.rate.toFixed(1)}% conv.</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Leads: {anuncio.leads}</span>
                      <span>Conversões: {anuncio.conversions}</span>
                    </div>
                    <Progress value={anuncio.rate} className="h-1 mt-2" />
                  </div>
                ))}
                {topAnuncios.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum cruzamento encontrado entre leads e anúncios.<br />
                    Verifique se os campos 'content' nos leads correspondem aos nomes dos criativos.
                  </p>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Análise por Respostas da Pesquisa */}
      {Object.keys(pesquisaAnalise).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversão por Respostas da Pesquisa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(pesquisaAnalise).map(([campo, valores]) => (
                <div key={campo}>
                  <h4 className="font-medium mb-3 capitalize">{campo.replace(/_/g, ' ')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(valores)
                      .sort((a, b) => b[1].conversao - a[1].conversao)
                      .slice(0, 8)
                      .map(([valor, stats]) => (
                        <div key={valor} className="border rounded p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">{valor}</span>
                            <Badge variant={stats.conversao > taxaConversaoGeral ? "default" : "secondary"}>
                              {stats.conversao.toFixed(1)}%
                            </Badge>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Total: {stats.total}</span>
                            <span>Compraram: {stats.compraram}</span>
                          </div>
                          <Progress value={stats.conversao} className="h-1 mt-2" />
                        </div>
                      ))}
                  </div>
                  {Object.keys(valores).length > 8 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Mostrando top 8 de {Object.keys(valores).length} respostas
                    </p>
                  )}
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outras Fontes */}
      {dados_outras_fontes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outras Fontes de Tráfego</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dados_outras_fontes.map((fonte, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{fonte.fonte || fonte.source || `Fonte ${index + 1}`}</span>
                    <div className="text-sm text-muted-foreground">
                      {Object.keys(fonte).filter(key => key !== 'fonte' && key !== 'source').length} campos
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}