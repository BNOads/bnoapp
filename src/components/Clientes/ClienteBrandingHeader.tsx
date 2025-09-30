import { useBranding } from './ClienteBrandingProvider';

interface ClienteBrandingHeaderProps {
  clienteNome: string;
}

export const ClienteBrandingHeader = ({ clienteNome }: ClienteBrandingHeaderProps) => {
  const branding = useBranding();

  if (!branding?.enabled) {
    return (
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">
        {clienteNome}
      </h1>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {branding.logoUrl && (
        <img 
          src={branding.logoUrl} 
          alt={`${clienteNome} logo`} 
          className="h-8 sm:h-10 lg:h-12 w-auto object-contain flex-shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <h1 
          className="text-xl sm:text-2xl lg:text-3xl font-bold break-words"
          style={{
            color: branding.primary || undefined
          }}
        >
          {clienteNome}
        </h1>
        {branding.description && (
          <p 
            className="text-sm sm:text-base opacity-80 mt-1 line-clamp-2"
            style={{
              color: branding.secondary || undefined
            }}
          >
            {branding.description}
          </p>
        )}
      </div>
    </div>
  );
};