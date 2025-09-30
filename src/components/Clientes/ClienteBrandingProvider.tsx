import { createContext, useContext, ReactNode, useEffect } from 'react';

interface BrandingConfig {
  enabled: boolean;
  logoUrl: string | null;
  primary: string | null;
  secondary: string | null;
  bg: string | null;
  description: string | null;
}

const BrandingContext = createContext<BrandingConfig | null>(null);

export const useBranding = () => {
  const context = useContext(BrandingContext);
  return context;
};

interface ClienteBrandingProviderProps {
  children: ReactNode;
  cliente: any;
}

export const ClienteBrandingProvider = ({ children, cliente }: ClienteBrandingProviderProps) => {
  const branding: BrandingConfig = {
    enabled: cliente?.branding_enabled || false,
    logoUrl: cliente?.branding_logo_url || null,
    primary: cliente?.branding_primary || null,
    secondary: cliente?.branding_secondary || null,
    bg: cliente?.branding_bg || null,
    description: cliente?.branding_description || null
  };

  useEffect(() => {
    if (branding.enabled && branding.primary) {
      document.documentElement.style.setProperty('--client-primary', branding.primary);
    }
    if (branding.enabled && branding.secondary) {
      document.documentElement.style.setProperty('--client-secondary', branding.secondary);
    }
    if (branding.enabled && branding.bg) {
      document.documentElement.style.setProperty('--client-bg', branding.bg);
    }

    return () => {
      document.documentElement.style.removeProperty('--client-primary');
      document.documentElement.style.removeProperty('--client-secondary');
      document.documentElement.style.removeProperty('--client-bg');
    };
  }, [branding]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
};
