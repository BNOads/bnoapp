import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="theme-select" className="flex items-center gap-2">
        {theme === "dark" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
        Tema da Interface
      </Label>
      <Select value={theme} onValueChange={setTheme}>
        <SelectTrigger id="theme-select" className="w-full">
          <SelectValue placeholder="Selecione o tema" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Claro
            </div>
          </SelectItem>
          <SelectItem value="dark">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Escuro
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
