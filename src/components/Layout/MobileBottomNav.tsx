import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, CheckSquare, Rocket, Shield, Settings } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export const MobileBottomNav = () => {
    const location = useLocation();
    const { userData } = useCurrentUser();
    const [activeTab, setActiveTab] = useState("dashboard");

    const tabs = [
        {
            id: "dashboard",
            label: "Home",
            icon: LayoutDashboard,
            path: "/",
        },
        {
            id: "tarefas",
            label: "Tarefas",
            icon: CheckSquare,
            path: "/tarefas",
        },
        {
            id: "ferramentas",
            label: "Ferramentas",
            icon: Rocket,
            path: "/ferramentas",
        },
    ];

    // Optional Admin/Config icons based on user permissions
    // In a real scenario we could conditionally show these
    const extraTabs = [
        {
            id: "orcamentos",
            label: "Funis",
            icon: Shield,
            path: "/ferramentas/orcamentos-funil",
        },
        {
            id: "config",
            label: "Config",
            icon: Settings,
            path: "/perfil",
        },
    ];

    useEffect(() => {
        const currentPath = location.pathname;
        const tabMatch = tabs.find(t => currentPath === t.path || currentPath.startsWith(t.path + '/'));
        const extraMatch = extraTabs.find(t => currentPath === t.path || currentPath.startsWith(t.path + '/'));

        if (tabMatch) setActiveTab(tabMatch.id);
        else if (extraMatch) setActiveTab(extraMatch.id);
        else setActiveTab("dashboard");
    }, [location.pathname]);

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-0 pt-0">
            <div className="bg-background/90 backdrop-blur-md border border-border/50 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_-8px_30px_rgb(255,255,255,0.03)] rounded-t-3xl sm:rounded-full sm:mb-4 px-2 py-2 flex items-center justify-between mx-auto max-w-md">

                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <Link
                            key={tab.id}
                            to={tab.path}
                            className={`relative flex items-center justify-center p-3 rounded-2xl transition-all duration-300 min-w-16 ${isActive
                                ? "text-primary dark:text-primary"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {isActive && (
                                <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-full scale-90 transition-transform" />
                            )}

                            <div className="relative flex flex-col items-center gap-1 z-10">
                                <Icon className={`h-6 w-6 transition-all duration-300 ${isActive ? "scale-110" : "scale-100"}`} strokeWidth={isActive ? 2.5 : 2} />
                                {isActive && (
                                    <>
                                        <span className="text-xs font-bold tracking-tight">{tab.label}</span>
                                        <div className="absolute -bottom-2 w-1/2 h-0.5 bg-primary rounded-full" />
                                    </>
                                )}
                            </div>
                        </Link>
                    );
                })}

                {/* Separator / Divider for extras visually */}
                <div className="w-[1px] h-8 bg-border/40 mx-1"></div>

                {extraTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <Link
                            key={tab.id}
                            to={tab.path}
                            className={`relative flex items-center justify-center p-3 transition-colors duration-300 ${isActive
                                ? "text-primary dark:text-primary"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <div className="relative flex flex-col items-center gap-1 z-10">
                                <Icon className={`h-5 w-5 ${isActive ? "scale-110" : "scale-100"}`} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            {isActive && (
                                <div className="absolute -bottom-1 w-1/2 h-0.5 bg-primary rounded-full" />
                            )}
                        </Link>
                    );
                })}

            </div>

            {/* iOS Home Indicator Safe Area (approximated) */}
            <div className="h-6 w-full bg-background/90 backdrop-blur-md flex justify-center items-end pb-2 sm:hidden">
                <div className="w-1/3 h-1 bg-muted-foreground/30 rounded-full"></div>
            </div>
        </div>
    );
};
