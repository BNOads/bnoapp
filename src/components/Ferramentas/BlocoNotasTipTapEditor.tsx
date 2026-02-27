import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { useState, useCallback, useEffect } from 'react';
import { CreateTaskModal } from '@/components/tasks/modals/CreateTaskModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Palette,
    Heading2,
    Undo2,
    Redo2,
} from 'lucide-react';

const COLORS = [
    { name: 'Padrão', value: '' },
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Laranja', value: '#f97316' },
    { name: 'Amarelo', value: '#eab308' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Roxo', value: '#a855f7' },
    { name: 'Rosa', value: '#ec4899' },
];

interface BlocoNotasTipTapEditorProps {
    content: any;
    onChange: (json: any) => void;
    placeholder?: string;
}

export function BlocoNotasTipTapEditor({
    content,
    onChange,
    placeholder = 'Escreva sua nota aqui...',
}: BlocoNotasTipTapEditorProps) {
    const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [taskSelectedText, setTaskSelectedText] = useState('');

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                defaultProtocol: 'https',
            }),
            Placeholder.configure({ placeholder }),
            Color,
            TextStyle,
        ],
        editorProps: {
            attributes: {
                class:
                    'min-h-[300px] outline-none p-4 prose prose-sm max-w-none dark:prose-invert focus:outline-none',
            },
        },
        onUpdate({ editor }) {
            onChange(editor.getJSON());
        },
    });

    // Carregar conteúdo inicial ou ao mudar de nota
    useEffect(() => {
        if (!editor) return;
        if (!content) {
            editor.commands.clearContent();
            return;
        }
        // Checar se o conteúdo atual do editor já é igual (evitar loop)
        const currentJSON = JSON.stringify(editor.getJSON());
        const newJSON = JSON.stringify(content);
        if (currentJSON !== newJSON) {
            editor.commands.setContent(content, false);
        }
    }, [content, editor]);

    const handleColorChange = useCallback(
        (color: string) => {
            if (!editor) return;
            if (color) {
                editor.chain().focus().setColor(color).run();
            } else {
                editor.chain().focus().unsetColor().run();
            }
            setColorPopoverOpen(false);
        },
        [editor]
    );

    const handleCreateTask = useCallback(() => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to, ' ').trim();
        if (!text) return;
        setTaskSelectedText(text);
        setTaskModalOpen(true);
    }, [editor]);

    if (!editor) return null;

    return (
        <div className="relative">
            {/* BubbleMenu – aparece ao selecionar texto */}
            <BubbleMenu
                editor={editor}
                options={{ placement: 'top', offset: 8 }}
                className="bg-card border border-border rounded-lg shadow-lg p-1 flex items-center gap-0.5 flex-wrap max-w-xs sm:max-w-none"
            >
                {/* Undo / Redo */}
                <BubbleBtn
                    icon={Undo2}
                    isActive={false}
                    onClick={() => editor.chain().focus().undo().run()}
                    tooltip="Desfazer"
                />
                <BubbleBtn
                    icon={Redo2}
                    isActive={false}
                    onClick={() => editor.chain().focus().redo().run()}
                    tooltip="Refazer"
                />

                <Divider />

                {/* Formatação */}
                <BubbleBtn
                    icon={Bold}
                    isActive={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    tooltip="Negrito (Ctrl+B)"
                />
                <BubbleBtn
                    icon={Italic}
                    isActive={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    tooltip="Itálico (Ctrl+I)"
                />
                <BubbleBtn
                    icon={UnderlineIcon}
                    isActive={editor.isActive('underline')}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    tooltip="Sublinhado (Ctrl+U)"
                />
                <BubbleBtn
                    icon={Heading2}
                    isActive={editor.isActive('heading', { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    tooltip="Título"
                />

                <Divider />

                {/* Cor */}
                <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className="p-2 rounded-md transition-all duration-200 hover:bg-accent"
                            aria-label="Cor do texto"
                            title="Cor do texto"
                        >
                            <Palette className="w-4 h-4" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-2 pointer-events-auto" side="top">
                        <div className="grid grid-cols-4 gap-1">
                            {COLORS.map((color) => (
                                <button
                                    key={color.value || 'default'}
                                    type="button"
                                    className={cn(
                                        'h-8 rounded border-2 transition-all hover:scale-110',
                                        !color.value && 'bg-gradient-to-br from-background to-muted'
                                    )}
                                    style={color.value ? { backgroundColor: color.value } : {}}
                                    onClick={() => handleColorChange(color.value)}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                <Divider />

                {/* Listas */}
                <BubbleBtn
                    icon={List}
                    isActive={editor.isActive('bulletList')}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    tooltip="Lista com marcadores"
                />
                <BubbleBtn
                    icon={ListOrdered}
                    isActive={editor.isActive('orderedList')}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    tooltip="Lista numerada"
                />

                <Divider />

                {/* Criar Tarefa */}
                <button
                    type="button"
                    onClick={handleCreateTask}
                    className="p-2 rounded-md transition-all duration-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-500"
                    aria-label="Criar Tarefa"
                    title="Criar Tarefa a partir do texto selecionado"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 10.5V12a9 9 0 1 1-5.04-8.06" />
                        <path d="m9 12 2.25 2.5L21 4" />
                        <path d="M19 19v4" />
                        <path d="M17 21h4" />
                    </svg>
                </button>
            </BubbleMenu>

            {/* Editor de texto */}
            <EditorContent editor={editor} />

            {/* Modal de criação de tarefa */}
            <CreateTaskModal
                open={taskModalOpen}
                onOpenChange={setTaskModalOpen}
                defaultTitle={taskSelectedText}
            />
        </div>
    );
}

// ——— Helpers internos ———

function BubbleBtn({
    icon: Icon,
    isActive,
    onClick,
    tooltip,
}: {
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
    onClick: () => void;
    tooltip: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'p-2 rounded-md transition-all duration-200 hover:bg-accent',
                isActive && 'bg-primary/10 text-primary'
            )}
            aria-label={tooltip}
            title={tooltip}
        >
            <Icon className="w-4 h-4" />
        </button>
    );
}

function Divider() {
    return <div className="w-px h-6 bg-border mx-0.5" />;
}
