import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { supabase } from '@/integrations/supabase/client';
import { MentionList } from './MentionList';
import { SuggestionOptions } from '@tiptap/suggestion';

export const suggestion: Omit<SuggestionOptions, 'editor'> = {
    items: async ({ query }) => {
        if (!query) {
            // Retorna alguns recentes ou favoritos se não houver query
            return [];
        }

        const searchLower = query.toLowerCase();
        const searchTerm = `%${query}%`;

        try {
            const [
                clientes,
                colaboradores,
                tarefas,
                documentos,
            ] = await Promise.all([
                supabase
                    .from('clientes')
                    .select('id, nome, nicho')
                    .or(`nome.ilike.${searchTerm},slug.ilike.${searchTerm}`)
                    .eq('ativo', true)
                    .limit(3),
                supabase
                    .from('colaboradores')
                    .select('id, nome, avatar_url, cargo_display')
                    .ilike('nome', searchTerm)
                    .eq('ativo', true)
                    .limit(3),
                supabase
                    .from('tasks')
                    .select('id, title, assignee')
                    .ilike('title', searchTerm)
                    .limit(3),
                supabase
                    .from('workspace_documents')
                    .select('id, title, emoji, is_public')
                    .or(`title.ilike.${searchTerm},content_html.ilike.${searchTerm}`)
                    .limit(3),
            ]);

            const results: any[] = [];

            clientes.data?.forEach(c => results.push({
                id: c.id,
                label: c.nome,
                subtitle: 'Cliente',
                type: 'cliente',
                url: `/painel/${c.id}`
            }));

            colaboradores.data?.forEach(c => results.push({
                id: c.id,
                label: c.nome,
                subtitle: c.cargo_display || 'Colaborador',
                avatar: c.avatar_url,
                type: 'colaborador',
                url: `/time` // Placeholder, ou pode abrir um modal. Ideal é ter um caminho real.
            }));

            tarefas.data?.forEach(t => results.push({
                id: t.id,
                label: t.title,
                subtitle: 'Tarefa',
                type: 'tarefa',
                url: `/tarefas/${t.id}`
            }));

            documentos.data?.forEach(d => results.push({
                id: d.id,
                label: `${d.emoji || "📝"} ${d.title || 'Sem título'}`,
                subtitle: 'Documento',
                type: 'documento',
                url: `/ferramentas/documentos?doc=${d.id}`
            }));

            return results;
        } catch (error) {
            console.error("Erro ao buscar menções:", error);
            return [];
        }
    },

    render: () => {
        let component: ReactRenderer;
        let popup: TippyInstance[];

        return {
            onStart: props => {
                component = new ReactRenderer(MentionList, {
                    props,
                    editor: props.editor,
                });

                if (!props.clientRect) {
                    return;
                }

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                });
            },

            onUpdate(props) {
                component.updateProps(props);

                if (!props.clientRect) {
                    return;
                }

                popup[0].setProps({
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                });
            },

            onKeyDown(props) {
                if (props.event.key === 'Escape') {
                    popup[0].hide();
                    return true;
                }

                return (component.ref as any)?.onKeyDown(props);
            },

            onExit() {
                if (popup && popup.length > 0) {
                    popup[0].destroy();
                }
                if (component) {
                    component.destroy();
                }
            },
        };
    },
};
