import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Option {
    id: string;
    name: string;
    avatar_url?: string | null;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    emptyMessage?: string;
    className?: string;
    disabled?: boolean;
    showAvatar?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onValueChange,
    placeholder = "Selecione uma opção...",
    emptyMessage = "Nenhuma opção encontrada.",
    className,
    disabled = false,
    showAvatar = false,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);

    const selectedOption = options.find((option) => option.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal", className)}
                    disabled={disabled}
                >
                    <span className="truncate flex items-center gap-2">
                        {selectedOption ? (
                            <>
                                {showAvatar && (
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage src={selectedOption.avatar_url || undefined} />
                                        <AvatarFallback className="text-[8px]">
                                            {selectedOption.name?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                {selectedOption.name}
                            </>
                        ) : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                    <CommandInput placeholder="Pesquisar..." />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.id}
                                    value={option.name}
                                    onSelect={() => {
                                        onValueChange(option.id === value ? "" : option.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 flex-shrink-0",
                                            value === option.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {showAvatar && (
                                        <Avatar className="h-6 w-6 mr-2 flex-shrink-0">
                                            <AvatarImage src={option.avatar_url || undefined} />
                                            <AvatarFallback className="text-[8px]">
                                                {option.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    {option.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
