import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          // Links em azul com hover
          a: ({ node, ...props }) => (
            <a
              {...props}
              className="text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          // Títulos com cores apropriadas e tamanhos menores
          h1: ({ node, ...props }) => (
            <h1 {...props} className="text-lg font-bold text-foreground mb-2 mt-3" />
          ),
          h2: ({ node, ...props }) => (
            <h2 {...props} className="text-base font-semibold text-foreground mb-2 mt-3" />
          ),
          h3: ({ node, ...props }) => (
            <h3 {...props} className="text-sm font-medium text-foreground mb-1 mt-2" />
          ),
          // Parágrafos compactos
          p: ({ node, ...props }) => (
            <p {...props} className="text-sm leading-relaxed mb-2" />
          ),
          // Listas compactas
          ul: ({ node, ...props }) => (
            <ul {...props} className="text-sm space-y-1 mb-2 ml-4" />
          ),
          ol: ({ node, ...props }) => (
            <ol {...props} className="text-sm space-y-1 mb-2 ml-4" />
          ),
          li: ({ node, ...props }) => (
            <li {...props} className="text-sm" />
          ),
          // Código inline
          code: ({ node, ...props }) => (
            <code {...props} className="bg-muted px-1 py-0.5 rounded text-xs font-mono" />
          ),
          // Blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote {...props} className="border-l-4 border-primary pl-3 my-2 text-muted-foreground italic" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}