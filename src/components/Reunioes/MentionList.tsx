import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useState,
} from 'react'
import { CheckSquare, Briefcase, Users, FileText, Loader2 } from 'lucide-react'

export const MentionList = forwardRef((props: any, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Reset index when items change
    useEffect(() => setSelectedIndex(0), [props.items])

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                const newIndex =
                    (selectedIndex + props.items.length - 1) % props.items.length
                setSelectedIndex(newIndex)
                return true
            }

            if (event.key === 'ArrowDown') {
                const newIndex = (selectedIndex + 1) % props.items.length
                setSelectedIndex(newIndex)
                return true
            }

            if (event.key === 'Enter') {
                if (props.items.length) {
                    props.command(props.items[selectedIndex])
                }
                return true
            }

            return false
        },
    }))

    const selectItem = (index: number) => {
        const item = props.items[index]
        if (item) {
            props.command(item)
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'cliente':
                return <Briefcase className="w-4 h-4 text-blue-500" />
            case 'colaborador':
                return <Users className="w-4 h-4 text-purple-500" />
            case 'tarefa':
                return <CheckSquare className="w-4 h-4 text-indigo-500" />
            case 'documento':
                return <FileText className="w-4 h-4 text-rose-500" />
            default:
                return <FileText className="w-4 h-4 text-muted-foreground" />
        }
    }

    if (props.items.length === 0) {
        return (
            <div className="bg-card border border-border rounded-lg shadow-lg p-3 w-64 text-sm text-muted-foreground flex flex-col items-center">
                {!props.query ? (
                    <span className="text-xs">Digite para pesquisar...</span>
                ) : (
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden w-72 flex flex-col py-1">
            {props.items.map((item: any, index: number) => (
                <button
                    className={`flex items-center gap-3 px-3 py-2 text-left w-full transition-colors
            ${index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}
          `}
                    key={index}
                    onClick={() => selectItem(index)}
                >
                    <div className="bg-background rounded p-1.5 shadow-sm border border-border/50">
                        {item.avatar ? (
                            <img src={item.avatar} alt={item.label} className="w-4 h-4 rounded-full" />
                        ) : (
                            getIcon(item.type)
                        )}
                    </div>
                    <div className="flex flex-col flex-1 truncate">
                        <span className="text-sm font-medium line-clamp-1">{item.label}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{item.subtitle}</span>
                    </div>
                </button>
            ))}
        </div>
    )
})
