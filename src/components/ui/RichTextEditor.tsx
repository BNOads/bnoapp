import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Link } from '@tiptap/extension-link'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  Underline, 
  Heading1, 
  Heading2, 
  List, 
  CheckSquare, 
  Link as LinkIcon,
  Palette,
  Plus,
  Undo,
  Redo
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useState, useCallback } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  showToolbar?: boolean
  onTitleExtracted?: (titles: string[]) => void
}

const COLORS = [
  '#000000', '#374151', '#6B7280', '#EF4444', '#F97316', 
  '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'
]

const DECISION_BLOCKS = [
  { id: 'action', label: 'Ação', icon: '📌', color: '#EF4444' },
  { id: 'decision', label: 'Decisão', icon: '✅', color: '#22C55E' },
  { id: 'followup', label: 'Follow-up', icon: '🔄', color: '#3B82F6' }
]

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Digite aqui...", 
  className = "",
  showToolbar = true,
  onTitleExtracted
}: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      TaskList,
      TaskItem.configure({
        nested: true
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
      
      // Extract titles for index
      if (onTitleExtracted) {
        const titles: string[] = []
        editor.state.doc.descendants((node) => {
          if (node.type.name === 'heading' && node.textContent) {
            titles.push(node.textContent)
          }
        })
        onTitleExtracted(titles)
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[120px] p-4'
      }
    }
  })

  const setLink = useCallback(() => {
    if (!editor) return

    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    
    setShowLinkDialog(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  const addDecisionBlock = (type: string) => {
    if (!editor) return
    
    const block = DECISION_BLOCKS.find(b => b.id === type)
    if (!block) return

    editor.chain().focus().insertContent([
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: `${block.icon} ${block.label}: `,
            marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { color: block.color } }]
          }
        ]
      }
    ]).run()
  }

  if (!editor) {
    return null
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {showToolbar && (
        <div className="border-b bg-muted/30 p-2">
          <div className="flex flex-wrap items-center gap-1">
            {/* Basic formatting */}
            <Button
              variant={editor.isActive('bold') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Button>
            
            <Button
              variant={editor.isActive('italic') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Button>

            <Button
              variant={editor.isActive('underline') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <Underline className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Headings */}
            <Button
              variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 className="h-4 w-4" />
            </Button>

            <Button
              variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Lists */}
            <Button
              variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Button>

            <Button
              variant={editor.isActive('taskList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            >
              <CheckSquare className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Color picker */}
            <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="grid grid-cols-5 gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      className="w-8 h-8 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        editor.chain().focus().setColor(color).run()
                        setShowColorPicker(false)
                      }}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Link */}
            <Popover open={showLinkDialog} onOpenChange={setShowLinkDialog}>
              <PopoverTrigger asChild>
                <Button 
                  variant={editor.isActive('link') ? 'default' : 'ghost'} 
                  size="sm"
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">URL</label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setLink()
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={setLink}>
                      Inserir Link
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        editor.chain().focus().unsetLink().run()
                        setShowLinkDialog(false)
                      }}
                    >
                      Remover Link
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-6" />

            {/* Decision blocks */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-1">
                  {DECISION_BLOCKS.map((block) => (
                    <Button
                      key={block.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => addDecisionBlock(block.id)}
                    >
                      <span className="mr-2">{block.icon}</span>
                      {block.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-6" />

            {/* Undo/Redo */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="relative">
        <EditorContent 
          editor={editor} 
          className="min-h-[120px] max-h-96 overflow-y-auto"
        />
        
        {editor.isEmpty && (
          <div className="absolute top-4 left-4 text-muted-foreground pointer-events-none">
            {placeholder}
          </div>
        )}

      </div>
    </div>
  )
}