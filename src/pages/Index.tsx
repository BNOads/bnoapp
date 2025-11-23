import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardView } from "@/components/Dashboard/DashboardView";
import { tornarTodosLancamentosPublicos } from "@/scripts/tornarLancamentosPublicos";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      // Redirect to the new route structure
      const routeMap: Record<string, string> = {
        'colaboradores': '/colaboradores',
        'clientes': '/clientes', 
        'lancamentos': '/lancamentos',
        'assistente': '/assistente',
        'treinamentos': '/treinamentos',
        'ferramentas': '/ferramentas'
      };
      
      const newRoute = routeMap[tabFromUrl];
      if (newRoute) {
        window.location.href = newRoute;
      }
    }
  }, [searchParams]);

  useEffect(() => {
    // Executar uma vez para tornar todos os lançamentos públicos
    const updateLancamentos = async () => {
      const executado = localStorage.getItem('lancamentos_publicos_executado');
      if (!executado) {
        try {
          await tornarTodosLancamentosPublicos();
          localStorage.setItem('lancamentos_publicos_executado', 'true');
          console.log('✅ Todos os lançamentos foram tornados públicos!');
        } catch (error) {
          console.error('Erro ao tornar lançamentos públicos:', error);
        }
      }
    };
    
    updateLancamentos();
  }, []);

  return <DashboardView />;
};

export default Index;