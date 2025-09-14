import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface PesquisaAnalysisProps {
  dados_pesquisa: any[];
  dados_compradores: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const PesquisaAnalysis = ({ dados_pesquisa = [], dados_compradores = [] }: PesquisaAnalysisProps) => {
  
  // 1. Distribuição por Faixa Etária
  const getDistribuicaoIdade = () => {
    const faixas = {
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55+': 0
    };

    dados_pesquisa.forEach(pessoa => {
      const idade = parseInt(pessoa.idade) || 0;
      if (idade >= 18 && idade <= 24) faixas['18-24']++;
      else if (idade >= 25 && idade <= 34) faixas['25-34']++;
      else if (idade >= 35 && idade <= 44) faixas['35-44']++;
      else if (idade >= 45 && idade <= 54) faixas['45-54']++;
      else if (idade >= 55) faixas['55+']++;
    });

    return Object.entries(faixas).map(([faixa, quantidade]) => ({
      faixa,
      quantidade,
      percentage: dados_pesquisa.length > 0 ? (quantidade / dados_pesquisa.length) * 100 : 0
    }));
  };

  // 2. Distribuição por Gênero
  const getDistribuicaoGenero = () => {
    const generos = dados_pesquisa.reduce((acc: any, pessoa: any) => {
      const genero = pessoa.sexo || pessoa.genero || 'Não informado';
      acc[genero] = (acc[genero] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(generos).map(([genero, quantidade]) => ({
      genero,
      quantidade: quantidade as number,
      percentage: dados_pesquisa.length > 0 ? ((quantidade as number) / dados_pesquisa.length) * 100 : 0
    }));
  };

  // 3. Distribuição por Renda
  const getDistribuicaoRenda = () => {
    const rendas = dados_pesquisa.reduce((acc: any, pessoa: any) => {
      const renda = pessoa.renda_mensal || pessoa.renda || 'Não informado';
      acc[renda] = (acc[renda] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(rendas).map(([renda, quantidade]) => ({
      renda,
      quantidade: quantidade as number,
      percentage: dados_pesquisa.length > 0 ? ((quantidade as number) / dados_pesquisa.length) * 100 : 0
    })).sort((a, b) => (b.quantidade as number) - (a.quantidade as number));
  };

  // 4. Distribuição por Formação
  const getDistribuicaoFormacao = () => {
    const formacoes = dados_pesquisa.reduce((acc: any, pessoa: any) => {
      const formacao = pessoa.formacao || pessoa['Qual é a sua formação?'] || 'Não informado';
      acc[formacao] = (acc[formacao] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(formacoes).map(([formacao, quantidade]) => ({
      formacao,
      quantidade: quantidade as number,
      percentage: dados_pesquisa.length > 0 ? ((quantidade as number) / dados_pesquisa.length) * 100 : 0
    })).sort((a, b) => (b.quantidade as number) - (a.quantidade as number));
  };

  // 5. Situação de Trabalho
  const getSituacaoTrabalho = () => {
    const situacoes = dados_pesquisa.reduce((acc: any, pessoa: any) => {
      const situacao = pessoa.situacao_trabalho || pessoa['Qual é a sua situação de trabalho atual?'] || 'Não informado';
      acc[situacao] = (acc[situacao] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(situacoes).map(([situacao, quantidade]) => ({
      situacao,
      quantidade: quantidade as number,
      percentage: dados_pesquisa.length > 0 ? ((quantidade as number) / dados_pesquisa.length) * 100 : 0
    })).sort((a, b) => (b.quantidade as number) - (a.quantidade as number));
  };

  // 6. Tempo de Formação
  const getTempoFormacao = () => {
    const tempos = dados_pesquisa.reduce((acc: any, pessoa: any) => {
      const tempo = pessoa.tempo_formado || pessoa['Há quanto tempo você se formou?'] || 'Não informado';
      acc[tempo] = (acc[tempo] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(tempos).map(([tempo, quantidade]) => ({
      tempo,
      quantidade: quantidade as number,
      percentage: dados_pesquisa.length > 0 ? ((quantidade as number) / dados_pesquisa.length) * 100 : 0
    })).sort((a, b) => (b.quantidade as number) - (a.quantidade as number));
  };

  // 7. Análise de Conversão por Segmento
  const getConversaoPorSegmento = () => {
    const segmentos = ['idade', 'sexo', 'renda_mensal'];
    
    return segmentos.map(segmento => {
      const dados = dados_pesquisa.reduce((acc: any, pessoa: any) => {
        const valor = pessoa[segmento] || pessoa[segmento.replace('_', ' ')] || 'Não informado';
        if (!acc[valor]) {
          acc[valor] = { leads: 0, vendas: 0 };
        }
        acc[valor].leads++;
        
        // Verificar se converteu
        const converteu = dados_compradores.some(comprador => comprador.email === pessoa.email);
        if (converteu) {
          acc[valor].vendas++;
        }
        
        return acc;
      }, {});

      return {
        segmento,
        dados: Object.entries(dados).map(([categoria, stats]: [string, any]) => ({
          categoria,
          leads: stats.leads,
          vendas: stats.vendas,
          conversao: stats.leads > 0 ? (stats.vendas / stats.leads) * 100 : 0
        })).sort((a, b) => b.conversao - a.conversao)
      };
    });
  };

  const distribuicaoIdade = getDistribuicaoIdade();
  const distribuicaoGenero = getDistribuicaoGenero();
  const distribuicaoRenda = getDistribuicaoRenda();
  const distribuicaoFormacao = getDistribuicaoFormacao();
  const situacaoTrabalho = getSituacaoTrabalho();
  const tempoFormacao = getTempoFormacao();
  const conversaoPorSegmento = getConversaoPorSegmento();

  if (dados_pesquisa.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise Demográfica</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhum dado de pesquisa disponível para análise.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Análise Demográfica da Pesquisa</CardTitle>
          <p className="text-sm text-muted-foreground">
            Análise baseada em {dados_pesquisa.length} respostas da pesquisa
          </p>
        </CardHeader>
      </Card>

      {/* Distribuição por Faixa Etária */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Faixa Etária</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distribuicaoIdade}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="faixa" />
              <YAxis />
              <Tooltip formatter={(value: number, name: string) => {
                if (name === 'percentage') return `${value.toFixed(1)}%`;
                return value;
              }} />
              <Bar dataKey="quantidade" fill="#8884d8" name="Quantidade" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição por Gênero */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Gênero</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={distribuicaoGenero}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ genero, percentage }) => `${genero} (${percentage.toFixed(1)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="quantidade"
              >
                {distribuicaoGenero.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição por Renda */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Renda Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distribuicaoRenda.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="renda" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#82ca9d" name="Quantidade" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição por Formação */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Formação</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distribuicaoFormacao.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="formacao" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#ffc658" name="Quantidade" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Situação de Trabalho */}
      <Card>
        <CardHeader>
          <CardTitle>Situação de Trabalho Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={situacaoTrabalho}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ situacao, percentage }) => `${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="quantidade"
              >
                {situacaoTrabalho.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string, props: any) => 
                [value, props.payload.situacao]
              } />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Análise de Conversão por Segmento */}
      {dados_compradores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Conversão por Segmento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {conversaoPorSegmento.map((segmento, index) => (
                <div key={segmento.segmento}>
                  <h4 className="text-lg font-semibold mb-3 capitalize">
                    {segmento.segmento.replace('_', ' ')}
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={segmento.dados.slice(0, 6)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="categoria" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis />
                      <Tooltip formatter={(value: number, name: string) => {
                        if (name === 'conversao') return `${value.toFixed(1)}%`;
                        return value;
                      }} />
                      <Bar dataKey="leads" fill="#8884d8" name="Leads" />
                      <Bar dataKey="vendas" fill="#82ca9d" name="Vendas" />
                      <Bar dataKey="conversao" fill="#ffc658" name="Conversão %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo Estatístico */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Estatístico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{dados_pesquisa.length}</div>
              <p className="text-sm text-muted-foreground">Total de Respostas</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {distribuicaoGenero.find(g => g.genero.toLowerCase().includes('feminino'))?.quantidade || 0}
              </div>
              <p className="text-sm text-muted-foreground">Mulheres</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {distribuicaoGenero.find(g => g.genero.toLowerCase().includes('masculino'))?.quantidade || 0}
              </div>
              <p className="text-sm text-muted-foreground">Homens</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {dados_compradores.length > 0 ? 
                  ((dados_compradores.filter(c => dados_pesquisa.some(p => p.email === c.email)).length / dados_pesquisa.length) * 100).toFixed(1) : 0}%
                </div>
              <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};