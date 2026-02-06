import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";

interface TextBlockEditorProps {
  title: string;
  icon: React.ReactNode;
  value: string;
  isAdmin: boolean;
  onSave: (value: string) => Promise<void>;
}

export const TextBlockEditor = ({ title, icon, value, isAdmin, onSave }: TextBlockEditorProps) => {
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  const hasChanges = text !== value;

  useEffect(() => {
    setText(value);
  }, [value]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>

      {isAdmin ? (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Digite a ${title.toLowerCase()} da empresa...`}
            className="min-h-[100px] bg-background border-border resize-y"
          />
          {hasChanges && (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Salvar
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-muted/30 rounded-lg">
          {value ? (
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{value}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Não definido ainda.</p>
          )}
        </div>
      )}
    </div>
  );
};
