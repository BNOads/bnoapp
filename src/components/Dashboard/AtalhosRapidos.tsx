import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    FileText, Palette, NotebookPen, DollarSign, BarChart3,
    Link, Key, MessageSquare, GripVertical, Plus, X, Rocket,
    Settings, Save, RotateCcw, Clock, Trophy, BookOpen
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

// Definição dos atalhos disponíveis (baseado em FerramentasView)
const AVAILABLE_SHORTCUTS = [
    { id: "criador-criativos", title: "Criador de Criativos", icon: Palette, color: "text-purple-600", route: "/criador-criativos" },
    { id: "arquivo-reuniao", title: "Arquivo de Reunião", icon: BookOpen, color: "text-teal-600", route: "/arquivo-reuniao" },
    { id: "referencias", title: "Referências", icon: Palette, color: "text-purple-600", route: "/referencias" },
    { id: "debriefings", title: "Debriefings", icon: FileText, color: "text-gray-400", route: "/ferramentas/debriefings", comingSoon: true },
    { id: "notas", title: "Bloco de Notas", icon: NotebookPen, color: "text-green-600", route: "/ferramentas/notas" },
    { id: "orcamentos-funil", title: "Orçamentos", icon: DollarSign, color: "text-emerald-600", route: "/ferramentas/orcamentos-funil" },
    { id: "lancamentos", title: "Lançamentos", icon: BarChart3, color: "text-blue-500", route: "/ferramentas/lancamentos" },
    { id: "utm-builder", title: "Criador de UTM", icon: Link, color: "text-cyan-600", route: "/ferramentas/utm-builder" },
    { id: "acessos-logins", title: "Acessos & Logins", icon: Key, color: "text-red-600", route: "/ferramentas/acessos-logins" },
    { id: "mensagens-semanais", title: "Mensagens Semanais", icon: MessageSquare, color: "text-indigo-600", route: "/ferramentas/mensagens-semanais" },
    { id: "links", title: "Links Importantes", icon: Link, color: "text-emerald-600", route: "/ferramentas/links" },
    { id: "nps", title: "NPS", icon: BarChart3, color: "text-gray-400", route: "/nps", comingSoon: true },
    { id: "desafio", title: "Desafio Gamificação", icon: Trophy, color: "text-yellow-600", route: "/gamificacao" },
];

const DEFAULT_SHORTCUTS = ["lancamentos", "notas", "orcamentos-funil", "desafio"];

// Componente de Card Sortable
const SortableShortcut = ({ id, shortcut, isEditMode, onRemove, variant = 'grid' }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const navigate = useNavigate();

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const Icon = shortcut.icon;
    const isSidebar = variant === 'sidebar';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                relative group flex items-center 
                ${isSidebar
                    ? 'flex-row justify-start px-4 py-4 w-full min-h-[64px] gap-4'
                    : 'flex-col justify-center p-4 h-28 w-full'
                } 
                bg-card hover:bg-muted/50 border rounded-xl transition-all 
                ${isDragging ? 'z-50 shadow-xl scale-105' : ''} 
                ${!isEditMode && 'cursor-pointer hover:scale-[1.02] hover:shadow-md'}
            `}
            onClick={() => {
                if (!isEditMode && !shortcut.comingSoon) {
                    navigate(shortcut.route);
                }
            }}
        >
            {isEditMode && (
                <>
                    <div {...attributes} {...listeners} className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 z-20 shadow-sm opacity-100"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(id);
                        }}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </>
            )}

            <div className={`
                flex items-center justify-center rounded-full bg-muted/30 
                ${isSidebar ? 'p-3' : 'p-2.5 mb-2'}
                ${shortcut.comingSoon ? 'grayscale opacity-70' : ''}
            `}>
                <Icon className={`
                    ${isSidebar ? 'h-7 w-7' : 'h-6 w-6'} 
                    ${shortcut.comingSoon ? 'text-gray-400' : shortcut.color}
                `} />
            </div>

            <div className="flex flex-col">
                <span className={`
                    font-medium line-clamp-2
                    ${isSidebar ? 'text-base text-left' : 'text-xs text-center'}
                    ${shortcut.comingSoon ? 'text-muted-foreground' : ''}
                `}>
                    {shortcut.title}
                </span>

                {shortcut.comingSoon && isSidebar && (
                    <span className="text-[10px] text-muted-foreground font-normal text-left">
                        Em breve
                    </span>
                )}
            </div>

            {shortcut.comingSoon && !isSidebar && (
                <Badge variant="outline" className="mt-1 text-[10px] h-4 px-1 py-0 border-muted-foreground/30 text-muted-foreground">
                    Em breve
                </Badge>
            )}
        </div>
    );
};

interface AtalhosRapidosProps {
    variant?: 'grid' | 'sidebar';
}

export const AtalhosRapidos = ({ variant = 'grid' }: AtalhosRapidosProps) => {
    const [shortcuts, setShortcuts] = useState<string[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { toast } = useToast();

    // Auto-detect variant based on screen size could be done here, but cleaner to pass as prop from parent
    const isSidebar = variant === 'sidebar';

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const saved = localStorage.getItem('dashboard-shortcuts');
        if (saved) {
            try {
                setShortcuts(JSON.parse(saved));
            } catch (e) {
                setShortcuts(DEFAULT_SHORTCUTS);
            }
        } else {
            setShortcuts(DEFAULT_SHORTCUTS);
        }
    }, []);

    const saveShortcuts = (newShortcuts: string[]) => {
        setShortcuts(newShortcuts);
        localStorage.setItem('dashboard-shortcuts', JSON.stringify(newShortcuts));
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = shortcuts.indexOf(active.id);
            const newIndex = shortcuts.indexOf(over.id);
            saveShortcuts(arrayMove(shortcuts, oldIndex, newIndex));
        }
    };

    const handleRemove = (id: string) => {
        saveShortcuts(shortcuts.filter(s => s !== id));
    };

    const handleAdd = (id: string) => {
        if (!shortcuts.includes(id)) {
            saveShortcuts([...shortcuts, id]);
        }
    };

    const activeShortcutsData = shortcuts
        .map(id => AVAILABLE_SHORTCUTS.find(s => s.id === id))
        .filter(Boolean) as typeof AVAILABLE_SHORTCUTS;

    return (
        <div className="space-y-4">
            <div className={`flex items-center justify-between ${isSidebar ? 'mb-2' : ''}`}>
                <h3 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
                    <Rocket className="h-6 w-6 text-primary" />
                    {!isSidebar && "Acesso Rápido"}
                    {isSidebar && <span className="hidden lg:inline">Acesso Rápido</span>}
                </h3>
                <div className="flex gap-2">
                    {isEditMode ? (
                        <>
                            <Button variant="outline" size="sm" onClick={() => {
                                setShortcuts(DEFAULT_SHORTCUTS);
                                localStorage.setItem('dashboard-shortcuts', JSON.stringify(DEFAULT_SHORTCUTS));
                            }}>
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={() => setIsEditMode(false)}>
                                <Save className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditMode(true)}>
                            <Settings className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={shortcuts} strategy={rectSortingStrategy}>
                    <div className={
                        isSidebar
                            ? "flex flex-col space-y-3"
                            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
                    }>
                        {activeShortcutsData.map((shortcut) => (
                            <SortableShortcut
                                key={shortcut.id}
                                id={shortcut.id}
                                shortcut={shortcut}
                                isEditMode={isEditMode}
                                onRemove={handleRemove}
                                variant={variant}
                            />
                        ))}

                        {/* Add Button - Always Visible */}
                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                            <DialogTrigger asChild>
                                <div className={
                                    isSidebar
                                        ? "flex items-center justify-center p-4 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 rounded-xl cursor-pointer transition-all min-h-[64px]"
                                        : "flex flex-col items-center justify-center p-4 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 rounded-xl cursor-pointer transition-all h-28"
                                }>
                                    <div className={`rounded-full bg-muted ${isSidebar ? 'p-1.5 mr-3' : 'p-2 mb-2'}`}>
                                        <Plus className={`${isSidebar ? 'h-4 w-4' : 'h-5 w-5'} text-muted-foreground`} />
                                    </div>
                                    <span className={`font-medium text-muted-foreground ${isSidebar ? 'text-sm' : 'text-xs'}`}>Adicionar</span>
                                </div>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Adicionar Atalho</DialogTitle>
                                </DialogHeader>
                                <ScrollArea className="h-[300px] pr-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {AVAILABLE_SHORTCUTS.filter(s => !shortcuts.includes(s.id)).map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex flex-col items-center p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                                                onClick={() => {
                                                    handleAdd(item.id);
                                                    setIsModalOpen(false);
                                                    toast({ title: "Atalho adicionado!" });
                                                }}
                                            >
                                                <item.icon className={`h-6 w-6 mb-2 ${item.comingSoon ? 'text-gray-400' : item.color}`} />
                                                <span className="text-xs font-medium text-center">{item.title}</span>
                                                {item.comingSoon && <span className="text-[10px] text-muted-foreground">(Em breve)</span>}
                                            </div>
                                        ))}
                                        {AVAILABLE_SHORTCUTS.filter(s => !shortcuts.includes(s.id)).length === 0 && (
                                            <p className="col-span-2 text-center text-muted-foreground text-sm py-8">
                                                Todos os atalhos já foram adicionados.
                                            </p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </DialogContent>
                        </Dialog>
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};
