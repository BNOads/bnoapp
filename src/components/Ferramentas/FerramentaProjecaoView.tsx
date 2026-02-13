import ProjecaoInterativa from '@/components/Orcamento/Projecao/ProjecaoInterativa';
import { Calculator } from 'lucide-react';

export default function FerramentaProjecaoView() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Calculator className="h-8 w-8 text-primary" />
                    Simulador de Funil
                </h1>
                <p className="text-muted-foreground">
                    Simule cenários, projete resultados e valide suas métricas de tráfego de forma independente.
                </p>
            </div>
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 sm:p-6 mb-6">
                <h2 className="text-xl font-bold text-primary mb-2 flex items-center gap-2">
                    Como usar o Simulador?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground leading-relaxed">
                    <div>
                        <p>Ajuste o <strong>Investimento</strong> e as métricas de entrada (CPM, CTR, etc) para projetar seus resultados. Use os sliders ou clique no lápis para digitar valores exatos.</p>
                    </div>
                    <div>
                        <p>Os <strong>Benchmarks de Mercado</strong> (barra verde) servem como guia. Se suas métricas estiverem abaixo da meta, foque em otimizar essa etapa específica do funil.</p>
                    </div>
                </div>
            </div>

            <ProjecaoInterativa
                investimentoBase={5000}
                funilNome="Simulação Livre"
                clienteNome="Ferramenta de Projeção"
            />
        </div>
    );
}
