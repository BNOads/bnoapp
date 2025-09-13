import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardView } from "@/components/Dashboard/DashboardView";

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

  return <DashboardView />;
};

export default Index;