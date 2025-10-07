import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetaKPI {
  label: string;
  valorAtual: number;
  meta: number;
  formato: 'moeda' | 'numero' | 'percentual';
  invertido?: boolean; // Para CPL e CPA (quanto menor, melhor)
}

interface MetasAcelerometroProps {
  kpis: MetaKPI[];
}

export default function MetasAcelerometro({ kpis }: MetasAcelerometroProps) {
  const getPercentualAtingido = (atual: number, meta: number, invertido = false) => {
    if (meta === 0) return 0;
    if (invertido) {
      // Para métricas invertidas (CPL, CPA), quanto menor o atual vs meta, melhor
      return Math.min(150, (meta / atual) * 100);
    }
    return (atual / meta) * 100;
  };

  const getStatusBadge = (percentual: number) => {
    if (percentual >= 100) return { label: 'Superou', color: 'bg-[#2563EB] text-white' };
    if (percentual >= 85) return { label: 'OK', color: 'bg-[#16A34A] text-white' };
    if (percentual >= 60) return { label: 'Atenção', color: 'bg-[#D97706] text-white' };
    return { label: 'Crítico', color: 'bg-[#DC2626] text-white' };
  };

  const getTendencia = (percentual: number) => {
    if (percentual > 100) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (percentual < 85) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-yellow-600" />;
  };

  const formatValue = (value: number, formato: 'moeda' | 'numero' | 'percentual') => {
    if (formato === 'moeda') {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (formato === 'percentual') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString('pt-BR');
  };

  const renderGauge = (percentual: number) => {
    const clampedPercentual = Math.min(100, Math.max(0, percentual));
    const rotation = (clampedPercentual / 100) * 180 - 90;
    
    let gaugeColor = '#DC2626'; // Crítico
    if (percentual >= 100) gaugeColor = '#2563EB'; // Superou
    else if (percentual >= 85) gaugeColor = '#16A34A'; // OK
    else if (percentual >= 60) gaugeColor = '#D97706'; // Atenção

    return (
      <div className="relative w-32 h-16 overflow-hidden">
        <svg className="w-32 h-32" viewBox="0 0 120 120" style={{ marginTop: '-60px' }}>
          {/* Fundo do gauge */}
          <path
            d="M 10,60 A 50,50 0 0,1 110,60"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Preenchimento do gauge */}
          <path
            d="M 10,60 A 50,50 0 0,1 110,60"
            fill="none"
            stroke={gaugeColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(clampedPercentual / 100) * 157} 157`}
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
          {/* Ponteiro */}
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="15"
            stroke={gaugeColor}
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${rotation} 60 60)`}
            style={{ transition: 'transform 0.8s ease' }}
          />
          {/* Centro do ponteiro */}
          <circle cx="60" cy="60" r="4" fill={gaugeColor} />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-semibold text-muted-foreground">
          {clampedPercentual.toFixed(0)}%
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.map((kpi, index) => {
        const percentual = getPercentualAtingido(kpi.valorAtual, kpi.meta, kpi.invertido);
        const status = getStatusBadge(percentual);
        const delta = kpi.valorAtual - kpi.meta;

        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header com label e status */}
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">{kpi.label}</h4>
                  <Badge className={status.color}>
                    {status.label}
                  </Badge>
                </div>

                {/* Gauge */}
                <div className="flex justify-center">
                  {renderGauge(percentual)}
                </div>

                {/* Valores */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Atual:</span>
                    <span className="text-sm font-bold">
                      {formatValue(kpi.valorAtual, kpi.formato)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Meta:</span>
                    <span className="text-sm font-medium">
                      {formatValue(kpi.meta, kpi.formato)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t">
                    <span className="text-xs text-muted-foreground">Delta:</span>
                    <div className="flex items-center gap-1">
                      {getTendencia(percentual)}
                      <span className={`text-sm font-semibold ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {delta > 0 ? '+' : ''}{formatValue(Math.abs(delta), kpi.formato)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
