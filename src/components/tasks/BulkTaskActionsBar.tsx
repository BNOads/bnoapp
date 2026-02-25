import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    UserPlus,
    Calendar as CalendarIcon,
    Copy,
    Trash2,
    X,
    ListIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BulkTaskActionsBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onAction: (action: string) => void;
}

export const BulkTaskActionsBar: React.FC<BulkTaskActionsBarProps> = ({
    selectedCount,
    onClearSelection,
    onAction,
}) => {
    if (selectedCount === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, x: '-50%', opacity: 0 }}
                animate={{ y: -32, x: '-50%', opacity: 1 }}
                exit={{ y: 100, x: '-50%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-8 left-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-md border border-border shadow-2xl rounded-full min-w-[300px] max-w-[90vw]"
            >
                <div className="flex items-center gap-3 px-2">
                    <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                        {selectedCount}
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">
                        Tarefas selecionadas
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClearSelection}
                        className="h-8 w-8 hover:bg-muted rounded-full"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="h-8 mx-1" />

                <TooltipProvider>
                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => onAction('status')} className="h-9 px-3 gap-2 rounded-full">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span className="text-xs hidden md:inline">Status</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Alterar status das tarefas</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => onAction('assignee')} className="h-9 px-3 gap-2 rounded-full">
                                    <UserPlus className="h-4 w-4 text-blue-500" />
                                    <span className="text-xs hidden md:inline">Responsável</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Alterar responsáveis</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => onAction('date')} className="h-9 px-3 gap-2 rounded-full">
                                    <CalendarIcon className="h-4 w-4 text-orange-500" />
                                    <span className="text-xs hidden md:inline">Datas</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Alterar datas de conclusão</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => onAction('list')} className="h-9 px-3 gap-2 rounded-full">
                                    <ListIcon className="h-4 w-4 text-purple-500" />
                                    <span className="text-xs hidden md:inline">Lista</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mover para outra lista</TooltipContent>
                        </Tooltip>

                        <Separator orientation="vertical" className="h-8 mx-1" />

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => onAction('duplicate')} className="h-9 w-9 rounded-full">
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicar tarefas</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => onAction('delete')} className="h-9 w-9 rounded-full hover:text-red-500">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir tarefas</TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            </motion.div>
        </AnimatePresence>
    );
};

export default BulkTaskActionsBar;
