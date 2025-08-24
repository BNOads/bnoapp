import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { DashboardView } from "@/components/Dashboard/DashboardView";
import { ColaboradoresView } from "@/components/Colaboradores/ColaboradoresView";
import { ClientesView } from "@/components/Clientes/ClientesView";
import { TreinamentosView } from "@/components/Treinamentos/TreinamentosView";
import { CalendarView } from "@/components/Calendar/CalendarView";
import { EscalaReunioes } from "@/components/Meetings/EscalaReunioes";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
      // Remove o parâmetro da URL após definir a aba
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const renderContent = () => {
    switch (activeTab) {
      case 'colaboradores':
        return <ColaboradoresView />;
      case 'clientes':
        return <ClientesView />;
      case 'calendario':
        return <CalendarView />;
      case 'reunioes':
        return <EscalaReunioes />;
      case 'treinamentos':
        return <TreinamentosView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="container mx-auto px-6 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
