import { useCallback, useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Palette,
  Underline as UnderlineIcon,
  Video,
} from "lucide-react";

interface DocumentosRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const COLOR_OPTIONS = [
  { value: "#111827", label: "Padrão" },
  { value: "#dc2626", label: "Vermelho" },
  { value: "#ea580c", label: "Laranja" },
  { value: "#ca8a04", label: "Amarelo" },
  { value: "#16a34a", label: "Verde" },
  { value: "#0d9488", label: "Turquesa" },
  { value: "#2563eb", label: "Azul" },
  { value: "#7c3aed", label: "Roxo" },
  { value: "#db2777", label: "Rosa" },
];

const normalizeUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const buildEmbedHtml = (rawUrl: string) => {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;

  const youtubeMatch =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/) ||
    url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (youtubeMatch?.[1]) {
    return `<div class="my-4 aspect-video"><iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" class="w-full h-full rounded-lg border" frameborder="0" allowfullscreen></iframe></div>`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch?.[1]) {
    return `<div class="my-4 aspect-video"><iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" class="w-full h-full rounded-lg border" frameborder="0" allowfullscreen></iframe></div>`;
  }

  if (url.includes("loom.com/share/")) {
    return `<div class="my-4 aspect-video"><iframe src="${url.replace("/share/", "/embed/")}" class="w-full h-full rounded-lg border" frameborder="0" allowfullscreen></iframe></div>`;
  }

  if (url.includes("drive.google.com")) {
    const previewUrl = url.includes("/preview") ? url : url.replace("/view", "/preview");
    return `<div class="my-4"><iframe src="${previewUrl}" class="w-full h-[420px] rounded-lg border" frameborder="0"></iframe></div>`;
  }

  return `<div class="my-4"><iframe src="${url}" class="w-full h-[420px] rounded-lg border" frameborder="0"></iframe></div>`;
};

export function DocumentosRichEditor({
  value,
  onChange,
  placeholder = "Comece a escrever...",
}: DocumentosRichEditorProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none px-4 py-4 focus:outline-none min-h-[480px] text-[15px] leading-7",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  const applyHeading = useCallback(
    (level: 1 | 2 | 3) => {
      if (!editor) return;
      editor.chain().focus().toggleHeading({ level }).run();
    },
    [editor]
  );

  const applyColor = useCallback(
    (color: string) => {
      if (!editor) return;
      editor.chain().focus().setColor(color).run();
    },
    [editor]
  );

  const removeColor = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetColor().run();
  }, [editor]);

  const handleInsertLink = useCallback(() => {
    if (!editor) return;

    const href = normalizeUrl(linkUrl);
    if (!href) return;

    if (editor.state.selection.empty) {
      const text = linkLabel.trim() || href;
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`)
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }

    setLinkUrl("");
    setLinkLabel("");
    setShowLinkDialog(false);
  }, [editor, linkLabel, linkUrl]);

  const handleInsertEmbed = useCallback(() => {
    if (!editor) return;

    const html = buildEmbedHtml(embedUrl);
    if (!html) return;

    editor.chain().focus().insertContent(html).run();
    setEmbedUrl("");
    setShowEmbedDialog(false);
  }, [editor, embedUrl]);

  const activeColor = useMemo(() => {
    if (!editor) return null;
    return COLOR_OPTIONS.find((option) =>
      editor.isActive("textStyle", { color: option.value })
    )?.value;
  }, [editor, editor?.state]);

  if (!editor) {
    return null;
  }

  return (
    <div className="h-full rounded-xl border bg-background shadow-sm overflow-hidden flex flex-col">
      <div className="border-b px-3 py-2 flex flex-wrap items-center gap-1 bg-muted/40">
        <Button
          type="button"
          variant={editor.isActive("heading", { level: 1 }) ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => applyHeading(1)}
          title="Título 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("heading", { level: 2 }) ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => applyHeading(2)}
          title="Título 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("heading", { level: 3 }) ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => applyHeading(3)}
          title="Título 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant={editor.isActive("bold") ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrito"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("italic") ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Itálico"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("underline") ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Sublinhado"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant={editor.isActive("bulletList") ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("orderedList") ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          variant={editor.isActive("link") ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setShowLinkDialog(true)}
          title="Inserir link"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setShowEmbedDialog(true)}
          title="Inserir embed"
        >
          <Video className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <div className="flex items-center gap-1">
          <Palette className="h-4 w-4 text-muted-foreground" />
          {COLOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`h-5 w-5 rounded-full border ${
                activeColor === option.value ? "ring-2 ring-primary ring-offset-1" : ""
              }`}
              style={{ backgroundColor: option.value }}
              onClick={() => applyColor(option.value)}
              title={option.label}
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={removeColor}
          >
            Limpar cor
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inserir hyperlink</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-link-url">URL</Label>
              <Input
                id="doc-link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://site.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-link-label">Texto (opcional)</Label>
              <Input
                id="doc-link-label"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="Texto do link"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleInsertLink} disabled={!linkUrl.trim()}>
                Inserir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inserir embed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-embed-url">URL para embed</Label>
              <Input
                id="doc-embed-url"
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="YouTube, Vimeo, Loom, Drive..."
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Você pode inserir links de vídeo ou documento incorporado.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEmbedDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleInsertEmbed} disabled={!embedUrl.trim()}>
                Inserir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
