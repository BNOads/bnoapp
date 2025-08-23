import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { DashboardView } from "@/components/Dashboard/DashboardView";
import { ColaboradoresView } from "@/components/Colaboradores/ColaboradoresView";
import { ClientesView } from "@/components/Clientes/ClientesView";
import { TreinamentosView } from "@/components/Treinamentos/TreinamentosView";

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'colaboradores':
        return <ColaboradoresView />;
      case 'clientes':
        return <ClientesView />;
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
