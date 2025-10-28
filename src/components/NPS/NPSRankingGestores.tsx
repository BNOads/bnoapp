import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp, AlertTriangle } from "lucide-react";

export function NPSRankingGestores() {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarRanking();
  }, []);

  const carregarRanking = async () => {
    try {
      const { data } = await supabase
        .from('nps_ranking_gestores' as any)
        .select('*')
        .order('nps_medio', { ascending: false });

      setRanking(data || []);
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando ranking...</div>;

  return (
    <div className="space-y-6">
      {/* Top 3 Destaque */}
      {ranking.length >= 3 && (
        <div className="grid md:grid-cols-3 gap-4">
          {ranking.slice(0, 3).map((gestor, idx) => (
            <Card key={gestor.gestor_id} className={idx === 0 ? "border-yellow-500 border-2" : ""}>
              <CardContent className="pt-6 text-center">
                <div className="mb-4">
                  {idx === 0 && <Trophy className="h-12 w-12 mx-auto text-yellow-500 mb-2" />}
                  {idx === 1 && <Trophy className="h-10 w-10 mx-auto text-gray-400 mb-2" />}
                  {idx === 2 && <Trophy className="h-10 w-10 mx-auto text-orange-600 mb-2" />}
                </div>
                <div className="text-2xl font-bold mb-1">{idx + 1}º Lugar</div>
                <div className="font-semibold text-lg mb-2">{gestor.gestor_nome}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NPS Médio:</span>
                    <span className="font-bold text-primary">{gestor.nps_medio?.toFixed(1) || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clientes:</span>
                    <span>{gestor.total_clientes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Alertas:</span>
                    <Badge variant={gestor.alertas_pendentes > 0 ? "destructive" : "default"}>
                      {gestor.alertas_pendentes}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabela Completa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ranking Completo de Gestores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Gestor</TableHead>
                <TableHead>NPS Médio</TableHead>
                <TableHead>Total Clientes</TableHead>
                <TableHead>Promotores</TableHead>
                <TableHead>Detratores</TableHead>
                <TableHead>Alertas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((gestor, idx) => (
                <TableRow key={gestor.gestor_id}>
                  <TableCell className="font-bold">
                    {idx === 0 && '🥇'}
                    {idx === 1 && '🥈'}
                    {idx === 2 && '🥉'}
                    {idx > 2 && `${idx + 1}º`}
                  </TableCell>
                  <TableCell className="font-medium">{gestor.gestor_nome}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">{gestor.nps_medio?.toFixed(1) || '-'}</span>
                      <span className="text-yellow-500">⭐</span>
                    </div>
                  </TableCell>
                  <TableCell>{gestor.total_clientes}</TableCell>
                  <TableCell className="text-green-600 font-semibold">{gestor.total_promotores || 0}</TableCell>
                  <TableCell className="text-red-600 font-semibold">{gestor.total_detratores || 0}</TableCell>
                  <TableCell>
                    {gestor.alertas_pendentes > 0 ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {gestor.alertas_pendentes}
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-100 text-green-800">0</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
