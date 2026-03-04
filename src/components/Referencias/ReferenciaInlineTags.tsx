import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X, Check, Loader2, Tag as TagIcon } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { ReferenciaItem } from "./ReferenciaCard";
import { cn } from "@/lib/utils";

interface ReferenciaInlineTagsProps {
    referencia: ReferenciaItem;
    availableTags: string[];
    onTagsChange?: (newTags: string[]) => void;
    disabled?: boolean;
}

export function ReferenciaInlineTags({
    referencia,
    availableTags,
    onTagsChange,
    disabled = false
}: ReferenciaInlineTagsProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const tags = referencia.tags || [];

    const handleSelectTag = (tag: string) => {
        if (disabled) return;

        let newTags;
        if (tags.includes(tag)) {
            newTags = tags.filter(t => t !== tag);
        } else {
            newTags = [...tags, tag];
        }

        onTagsChange?.(newTags);

        // We don't close the popover immediately to allow multi-selection
        setSearch("");
    };

    const currentTags = referencia.tags || [];

    // Tag creation: offer to create whatever they typed if it doesn't match exactly
    const normalizedSearch = search.trim().toLowerCase().replace(/\s+/g, '-');
    const showCreateOption = normalizedSearch &&
        !availableTags.some(t => t.toLowerCase() === normalizedSearch) &&
        !currentTags.some(t => t.toLowerCase() === normalizedSearch);

    // Color generation based on tag name
    const getTagColor = (tag: string) => {
        let hash = 0;
        for (let i = 0; i < tag.length; i++) {
            hash = tag.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Define some distinct, pleasant pastel colors
        const colors = [
            "bg-blue-100 text-blue-700 border-blue-200",
            "bg-orange-100 text-orange-700 border-orange-200",
            "bg-teal-100 text-teal-700 border-teal-200",
            "bg-violet-100 text-violet-700 border-violet-200",
            "bg-sky-100 text-sky-700 border-sky-200",
            "bg-emerald-100 text-emerald-700 border-emerald-200",
            "bg-pink-100 text-pink-700 border-pink-200",
            "bg-indigo-100 text-indigo-700 border-indigo-200",
            "bg-cyan-100 text-cyan-700 border-cyan-200",
            "bg-rose-100 text-rose-700 border-rose-200",
            "bg-amber-100 text-amber-700 border-amber-200",
            "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
        ];

        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5 min-h-[28px]">
            {currentTags.map((tag) => (
                <Badge
                    key={tag}
                    variant="outline"
                    className={cn(
                        "text-[10px] font-medium px-2 py-0 h-5 pr-1 gap-1 flex items-center shadow-none border",
                        getTagColor(tag),
                        disabled ? "pr-2" : ""
                    )}
                >
                    #{tag}
                    {!disabled && (
                        <div
                            className="text-current hover:opacity-75 cursor-pointer rounded-full p-0.5 transition-colors"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSelectTag(tag);
                            }}
                        >
                            <X className="w-2.5 h-2.5" />
                        </div>
                    )}
                </Badge>
            ))}

            {!disabled && (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-5 rounded-full px-2 text-[10px] border-dashed text-muted-foreground hover:text-foreground bg-transparent"
                        >
                            <Plus className="w-3 h-3 mr-0.5" />
                            Adicionar
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0" align="start">
                        <Command shouldFilter={true}>
                            <CommandInput
                                placeholder="Buscar ou criar tag..."
                                value={search}
                                onValueChange={setSearch}
                                className="h-8 text-xs"
                            />
                            <CommandList>
                                <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
                                <CommandGroup heading="Tags disponíveis" className="max-h-[200px] overflow-y-auto">
                                    {/* Combinação de tags atuais (para facilitar remoção) e tags disponíveis */}
                                    {Array.from(new Set([...currentTags, ...availableTags])).sort().map((tag) => {
                                        const isSelected = currentTags.includes(tag);
                                        return (
                                            <CommandItem
                                                key={tag}
                                                value={tag}
                                                onSelect={() => handleSelectTag(tag)}
                                                className="text-xs"
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="flex items-center gap-2">
                                                        <TagIcon className="w-3 h-3 text-muted-foreground" />
                                                        {tag}
                                                    </span>
                                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                                </div>
                                            </CommandItem>
                                        );
                                    })}

                                    {showCreateOption && (
                                        <CommandItem
                                            value={search} // So it can be matched
                                            onSelect={() => handleSelectTag(normalizedSearch)}
                                            className="text-xs text-primary font-medium"
                                        >
                                            <Plus className="w-3 h-3 mr-2" />
                                            Criar "{normalizedSearch}"
                                        </CommandItem>
                                    )}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
