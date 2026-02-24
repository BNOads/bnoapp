import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TaskInsert } from "@/types/tasks";

export interface DraftTask {
    id: string; // random UUID for the draft
    title: string;
    description: string;
    assignee: string | null;
    priority: string;
    list_id: string | null;
    cliente_id: string | null;
    criativos: string[] | null;
    recurrence: string | null;
    due_date: string | null;
    updated_at: string;
}

interface DraftTasksState {
    drafts: DraftTask[];
    addDraft: (draft: Omit<DraftTask, "id" | "updated_at">) => void;
    updateDraft: (id: string, draft: Partial<Omit<DraftTask, "id" | "updated_at">>) => void;
    removeDraft: (id: string) => void;
    clearDrafts: () => void;
}

export const useDraftTasksStore = create<DraftTasksState>()(
    persist(
        (set) => ({
            drafts: [],
            addDraft: (draft) => {
                const newDraft: DraftTask = {
                    ...draft,
                    id: crypto.randomUUID(),
                    updated_at: new Date().toISOString(),
                };
                set((state) => ({ drafts: [newDraft, ...state.drafts] }));
            },
            updateDraft: (id, draft) => {
                set((state) => ({
                    drafts: state.drafts.map((d) =>
                        d.id === id ? { ...d, ...draft, updated_at: new Date().toISOString() } : d
                    ),
                }));
            },
            removeDraft: (id) => {
                set((state) => ({ drafts: state.drafts.filter((d) => d.id !== id) }));
            },
            clearDrafts: () => set({ drafts: [] }),
        }),
        {
            name: "bnoapp-draft-tasks",
        }
    )
);
