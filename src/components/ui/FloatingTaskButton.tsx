import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateTaskModal } from "@/components/tasks/modals/CreateTaskModal";

function TaskPlusIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
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
    );
}

export function FloatingTaskButton() {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <Button
                onClick={() => setModalOpen(true)}
                className="fixed bottom-[80px] right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-amber-500 hover:bg-amber-600 p-0 text-white"
                title="Nova Tarefa"
            >
                <TaskPlusIcon className="h-6 w-6" />
            </Button>

            <CreateTaskModal
                open={modalOpen}
                onOpenChange={setModalOpen}
            />
        </>
    );
}
