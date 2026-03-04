/** Extract client name prefix from event title like "RAQUELPERONDI | Reunião de Briefing" */
export function parseClientFromTitle(title: string): string | null {
    const match = title.match(/^([^|–\-]+)\s*[|–\-]/);
    return match ? match[1].trim() : null;
}
