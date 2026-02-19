import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Task } from "@/types/tasks";

export function exportTasksToPDF(tasks: Task[]) {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Relatório de Tarefas", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 30);

    doc.setFontSize(12);
    doc.setTextColor(0);

    let y = 45;

    tasks.forEach((task, index) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }

        // Header
        doc.setFont("helvetica", "bold");
        const status = task.completed ? "[Concluída]" : "[Pendente]";

        // Auto-wrap title
        const maxTitleLen = 80;
        let titleStr = `${index + 1}. ${status} ${task.title}`;
        if (titleStr.length > maxTitleLen) {
            titleStr = titleStr.substring(0, maxTitleLen) + "...";
        }
        doc.text(titleStr, 14, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(80);

        const elements = [];
        if (task.assignee) elements.push(`Resp: ${task.assignee}`);
        if (task.due_date) elements.push(`Prazo: ${format(new Date(`${task.due_date}T00:00:00`), "dd/MM/yyyy")}`);
        if (task.priority) elements.push(`Prio: ${task.priority}`);
        if (task.category) elements.push(`Cat: ${task.category}`);

        if (elements.length > 0) {
            doc.text(elements.join(" | "), 14, y);
            y += 6;
        }

        if (task.description) {
            doc.setFontSize(9);
            const descStr = task.description.length > 100 ? task.description.substring(0, 100) + "..." : task.description;
            doc.text(doc.splitTextToSize(`Desc: ${descStr}`, 180), 14, y);
            y += 8;
        } else {
            y += 4;
        }

        // Reset defaults for next item
        doc.setTextColor(0);
        doc.setFontSize(12);
    });

    doc.save(`tarefas-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
