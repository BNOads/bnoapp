import { useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UploadStepProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  onNext: () => void;
}

export const UploadStep = ({ images, onImagesChange, onNext }: UploadStepProps) => {
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validar formatos
    const validFiles = files.filter(file => {
      const validFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!validFormats.includes(file.type)) {
        toast.error(`${file.name} não é um formato válido`);
        return false;
      }
      return true;
    });

    // Validar tamanho mínimo
    const checkedFiles = validFiles.filter(file => {
      return new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => {
          if (img.width < 1080 || img.height < 1080) {
            toast.error(`${file.name} deve ter pelo menos 1080x1080px`);
            resolve(false);
          } else {
            resolve(true);
          }
        };
        img.src = URL.createObjectURL(file);
      });
    });

    onImagesChange([...images, ...validFiles]);
    toast.success(`${validFiles.length} imagem(ns) adicionada(s)`);
  }, [images, onImagesChange]);

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    toast.success("Imagem removida");
  };

  const canProceed = images.length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Upload de Imagens</h2>
        <p className="text-muted-foreground">
          Envie uma ou mais imagens base para criar seus criativos
        </p>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors">
        <label className="cursor-pointer block">
          <input
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-lg font-medium">
                Clique ou arraste imagens aqui
              </p>
              <p className="text-sm text-muted-foreground">
                PNG, JPG, JPEG, WEBP • Mínimo 1080px
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Preview Grid */}
      {images.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">
            Imagens Selecionadas ({images.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {file.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canProceed}
          size="lg"
        >
          Próximo
        </Button>
      </div>
    </div>
  );
};
