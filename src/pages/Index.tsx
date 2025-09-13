import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { DashboardView } from "@/components/Dashboard/DashboardView";
import { ColaboradoresView } from "@/components/Colaboradores/ColaboradoresView";
import { ClientesView } from "@/components/Clientes/ClientesView";
import { AssistenteView } from "@/components/Assistente/AssistenteView";
import { TreinamentosView } from "@/components/Treinamentos/TreinamentosView";
import { FerramentasView } from "@/components/Ferramentas/FerramentasView";
import LancamentosView from "@/components/Lancamentos/LancamentosView";
import { EscalaReunioes } from "@/components/Meetings/EscalaReunioes";


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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <DashboardView />
      </main>
    </div>
  );
};

export default Index;