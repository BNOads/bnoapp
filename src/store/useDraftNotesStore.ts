import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DraftNote {
    id: string;
    titulo: string;
    conteudo: string;
    updated_at: string;
}

interface DraftNotesState {
    drafts: DraftNote[];
    addDraft: (draft: Omit<DraftNote, "id" | "updated_at">) => void;
    updateDraft: (id: string, draft: Partial<Omit<DraftNote, "id" | "updated_at">>) => void;
    removeDraft: (id: string) => void;
    clearDrafts: () => void;
}

export const useDraftNotesStore = create<DraftNotesState>()(
    persist(
        (set) => ({
            drafts: [],
            addDraft: (draft) => {
                const newDraft: DraftNote = {
                    ...draft,
                    id: crypto.randomUUID(),
                    updated_at: new Date().toISOString(),
                };
                set((state) => ({ drafts: [newDraft, ...state.drafts] }));
            },
            updateDraft: (id, draft) => {
                set((state) => ({
                    drafts: state.drafts.map((d) =>
                        d.id === id
                            ? { ...d, ...draft, updated_at: new Date().toISOString() }
                            : d
                    ),
                }));
            },
            removeDraft: (id) => {
                set((state) => ({ drafts: state.drafts.filter((d) => d.id !== id) }));
            },
            clearDrafts: () => set({ drafts: [] }),
        }),
        {
            name: "bnoapp-draft-notes",
        }
    )
);
