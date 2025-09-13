import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavoriteTabs } from "@/hooks/useFavoriteTabs";
import { useToast } from "@/hooks/use-toast";

interface FavoriteButtonProps {
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function FavoriteButton({ className, size = "sm" }: FavoriteButtonProps) {
  const { toggleCurrentPageFavorite, isCurrentPageFavorite } = useFavoriteTabs();
  const { toast } = useToast();

  const handleToggleFavorite = () => {
    const result = toggleCurrentPageFavorite();
    
    if (!result.success && result.message) {
      toast({
        title: "Limite atingido",
        description: result.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleToggleFavorite}
      className={className}
      title={isCurrentPageFavorite() ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <Star className={`h-4 w-4 ${isCurrentPageFavorite() ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
      {isCurrentPageFavorite() ? "Favoritado" : "Favoritar"}
    </Button>
  );
}