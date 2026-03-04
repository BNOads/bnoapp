import Heading from '@tiptap/extension-heading';

export const CustomHeading = Heading.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            eventId: {
                default: null,
                parseHTML: element => element.getAttribute('data-event-id'),
                renderHTML: attributes => {
                    if (!attributes.eventId) return {};
                    return { 'data-event-id': attributes.eventId };
                },
            },
        };
    },
});

export default CustomHeading;
