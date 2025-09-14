import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface AdvancedChartsProps {
  dados_leads?: any[];
  dados_compradores?: any[];
  dados_trafego?: any[];
  debriefing: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const AdvancedCharts = ({ dados_leads = [], dados_compradores = [], dados_trafego = [], debriefing }: AdvancedChartsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // 1. Distribuição de Verba por Etapa
  const getVerbaPorEtapa = () => {
    const totalInvestimento = debriefing.investimento_total || 0;
    const distribuicao = [
      { name: 'Captação', value: totalInvestimento * 0.4, percentage: 40, color: '#0088FE' },
      { name: 'Aquecimento', value: totalInvestimento * 0.3, percentage: 30, color: '#00C49F' },
      { name: 'CPLs', value: totalInvestimento * 0.2, percentage: 20, color: '#FFBB28' },
      { name: 'Lembrete', value: totalInvestimento * 0.1, percentage: 10, color: '#FF8042' },
    ];
    return distribuicao;
  };

  // 2. Desempenho por Plataforma
  const getDesempenhoPorPlataforma = () => {
    const trafegoAgrupado = dados_trafego.reduce((acc: any, item: any) => {
      const plataforma = item['Campaign Name']?.includes('Google') ? 'Google Ads' : 'Meta Ads';
      if (!acc[plataforma]) {
        acc[plataforma] = {
          investimento: 0,
          impressoes: 0,
          cliques: 0,
          leads: 0,
          cpl: 0,
          ctr: 0
        };
      }
      acc[plataforma].investimento += parseFloat(item['Spend (Cost, Amount Spent)'] || 0);
      acc[plataforma].impressoes += parseInt(item['Impressions'] || 0);
      acc[plataforma].cliques += parseInt(item['Action Link Clicks'] || 0);
      acc[plataforma].leads += parseInt(item['Action Leads'] || 0);
      return acc;
    }, {});

    return Object.keys(trafegoAgrupado).map(plataforma => ({
      plataforma,
      ...trafegoAgrupado[plataforma],
      cpl: trafegoAgrupado[plataforma].leads > 0 ? trafegoAgrupado[plataforma].investimento / trafegoAgrupado[plataforma].leads : 0,
      ctr: trafegoAgrupado[plataforma].impressoes > 0 ? (trafegoAgrupado[plataforma].cliques / trafegoAgrupado[plataforma].impressoes) * 100 : 0
    }));
  };

  // 3. Temperatura do Público
  const getTemperaturaPublico = () => {
    const temperaturas = dados_leads.reduce((acc: any, lead: any) => {
      const temp = lead.temperatura || 'Morno';
      if (!acc[temp]) {
        acc[temp] = { leads: 0, vendas: 0 };
      }
      acc[temp].leads++;
      
      const ehComprador = dados_compradores.some((comprador: any) => comprador.email === lead.email);
      if (ehComprador) {
        acc[temp].vendas++;
      }
      return acc;
    }, {});

    return Object.keys(temperaturas).map(temp => ({
      temperatura: temp,
      leads: temperaturas[temp].leads,
      vendas: temperaturas[temp].vendas,
      conversao: temperaturas[temp].leads > 0 ? (temperaturas[temp].vendas / temperaturas[temp].leads) * 100 : 0
    }));
  };

  // 4. Top Criativos
  const getTopCriativos = () => {
    const criativosData = dados_trafego.reduce((acc: any, item: any) => {
      const criativo = item['Ad Name'] || 'Criativo não identificado';
      if (!acc[criativo]) {
        acc[criativo] = {
          leads: 0,
          gasto: 0,
          cliques: 0,
          impressoes: 0
        };
      }
      acc[criativo].leads += parseInt(item['Action Leads'] || 0);
      acc[criativo].gasto += parseFloat(item['Spend (Cost, Amount Spent)'] || 0);
      acc[criativo].cliques += parseInt(item['Action Link Clicks'] || 0);
      acc[criativo].impressoes += parseInt(item['Impressions'] || 0);
      return acc;
    }, {});

    return Object.keys(criativosData)
      .map(criativo => ({
        criativo,
        ...criativosData[criativo],
        cpl: criativosData[criativo].leads > 0 ? criativosData[criativo].gasto / criativosData[criativo].leads : 0,
        ctr: criativosData[criativo].impressoes > 0 ? (criativosData[criativo].cliques / criativosData[criativo].impressoes) * 100 : 0
      }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 5);
  };

  // 5. Vendas por Dia
  const getVendasPorDia = () => {
    const vendasPorDia = dados_compradores.reduce((acc: any, comprador: any) => {
      const data = new Date(comprador.data || Date.now()).toLocaleDateString('pt-BR');
      if (!acc[data]) {
        acc[data] = 0;
      }
      acc[data]++;
      return acc;
    }, {});

    return Object.keys(vendasPorDia)
      .sort((a, b) => new Date(a.split('/').reverse().join('-')).getTime() - new Date(b.split('/').reverse().join('-')).getTime())
      .map(data => ({
        data,
        vendas: vendasPorDia[data]
      }));
  };

  // 6. Perfil Demográfico - Gênero
  const getPerfilGenero = () => {
    const generoLeads = dados_leads.reduce((acc: any, lead: any) => {
      const genero = lead.genero || 'Não informado';
      acc[genero] = (acc[genero] || 0) + 1;
      return acc;
    }, {});

    const generoVendas = dados_compradores.reduce((acc: any, comprador: any) => {
      const genero = comprador.genero || 'Não informado';
      acc[genero] = (acc[genero] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(generoLeads).map(genero => ({
      genero,
      leads: generoLeads[genero] || 0,
      vendas: generoVendas[genero] || 0,
      conversao: generoLeads[genero] > 0 ? ((generoVendas[genero] || 0) / generoLeads[genero]) * 100 : 0
    }));
  };

  // 7. Perfil por Idade
  const getPerfilIdade = () => {
    const getIdadeFaixa = (idade: number) => {
      if (idade < 25) return '18-24';
      if (idade < 35) return '25-34';
      if (idade < 45) return '35-44';
      if (idade < 55) return '45-54';
      return '55+';
    };

    const idadeLeads = dados_leads.reduce((acc: any, lead: any) => {
      const faixa = getIdadeFaixa(lead.idade || 30);
      acc[faixa] = (acc[faixa] || 0) + 1;
      return acc;
    }, {});

    const idadeVendas = dados_compradores.reduce((acc: any, comprador: any) => {
      const faixa = getIdadeFaixa(comprador.idade || 30);
      acc[faixa] = (acc[faixa] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(idadeLeads).map(faixa => ({
      faixa,
      leads: idadeLeads[faixa] || 0,
      vendas: idadeVendas[faixa] || 0,
      conversao: idadeLeads[faixa] > 0 ? ((idadeVendas[faixa] || 0) / idadeLeads[faixa]) * 100 : 0
    }));
  };

  const verbaPorEtapa = getVerbaPorEtapa();
  const plataformas = getDesempenhoPorPlataforma();
  const temperaturas = getTemperaturaPublico();
  const topCriativos = getTopCriativos();
  const vendasPorDia = getVendasPorDia();
  const perfilGenero = getPerfilGenero();
  const perfilIdade = getPerfilIdade();

  return (
    <div className="space-y-6">
      {/* Distribuição de Verba por Etapa */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Verba por Etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={verbaPorEtapa}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {verbaPorEtapa.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {verbaPorEtapa.map((etapa, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: etapa.color }}></div>
                    <span>{etapa.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(etapa.value)}</div>
                    <div className="text-sm text-muted-foreground">{etapa.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desempenho por Plataforma */}
      {plataformas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por Plataforma de Tráfego</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={plataformas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="plataforma" />
                <YAxis />
                <Tooltip formatter={(value: number, name: string) => {
                  if (name === 'investimento') return formatCurrency(value);
                  if (name === 'cpl') return formatCurrency(value);
                  if (name === 'ctr') return `${value.toFixed(2)}%`;
                  return value;
                }} />
                <Bar dataKey="leads" fill="#8884d8" name="Leads" />
                <Bar dataKey="cpl" fill="#82ca9d" name="CPL" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Temperatura do Público */}
      {temperaturas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Temperatura do Público</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={temperaturas}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ temperatura, leads }) => `${temperatura} (${leads})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="leads"
                  >
                    {temperaturas.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={temperaturas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="temperatura" />
                  <YAxis />
                  <Tooltip formatter={(value: number, name: string) => {
                    if (name === 'conversao') return `${value.toFixed(1)}%`;
                    return value;
                  }} />
                  <Bar dataKey="vendas" fill="#82ca9d" name="Vendas" />
                  <Bar dataKey="conversao" fill="#ffc658" name="Taxa de Conversão %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Criativos */}
      {topCriativos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Criativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-2 text-left">Criativo</th>
                    <th className="border border-gray-300 p-2 text-center">Leads</th>
                    <th className="border border-gray-300 p-2 text-center">CPL</th>
                    <th className="border border-gray-300 p-2 text-center">CTR</th>
                    <th className="border border-gray-300 p-2 text-center">Gasto</th>
                  </tr>
                </thead>
                <tbody>
                  {topCriativos.map((criativo, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-2">{criativo.criativo}</td>
                      <td className="border border-gray-300 p-2 text-center">{criativo.leads}</td>
                      <td className="border border-gray-300 p-2 text-center">{formatCurrency(criativo.cpl)}</td>
                      <td className="border border-gray-300 p-2 text-center">{criativo.ctr.toFixed(2)}%</td>
                      <td className="border border-gray-300 p-2 text-center">{formatCurrency(criativo.gasto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendas por Dia */}
      {vendasPorDia.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={vendasPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="vendas" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Perfil Demográfico - Gênero */}
      {perfilGenero.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Perfil Demográfico - Gênero</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={perfilGenero}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="genero" />
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
          </CardContent>
        </Card>
      )}

      {/* Perfil Demográfico - Idade */}
      {perfilIdade.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Perfil Demográfico - Faixa Etária</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={perfilIdade}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="faixa" />
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};