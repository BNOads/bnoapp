import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/** Ensure URL always has a protocol — prevents relative-path redirect bug */
function normalizeUrl(url: string): string {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (/^[a-z][a-z\d+\-.]*:/i.test(url)) return url; // mailto:, tel:, etc.
    return "https://" + url;
}

export default function RedirectPage() {
    const { slug } = useParams<{ slug: string }>();
    const [notFound, setNotFound] = useState(false);
    const ranRef = useRef(false);

    useEffect(() => {
        if (!slug || ranRef.current) return;
        ranRef.current = true;

        const fetchAndRedirect = async () => {
            const { data, error } = await supabase
                .from("utm_redirects")
                .select("destination_url, fb_pixel_id, fb_pixel_event, gtm_id, custom_script")
                .eq("slug", slug)
                .maybeSingle();

            if (error || !data) {
                setNotFound(true);
                return;
            }

            // Fire and forget – increment the click counter
            supabase.rpc("increment_redirect_click", { p_slug: slug });

            // Inject Facebook Pixel
            if (data.fb_pixel_id) {
                const el = document.createElement("script");
                el.innerHTML = `
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${data.fb_pixel_id}');fbq('track','${(data as any).fb_pixel_event || 'PageView'}');
        `;
                document.head.appendChild(el);
            }

            // Inject Google Tag Manager
            if (data.gtm_id) {
                const el = document.createElement("script");
                el.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
          j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${data.gtm_id}');`;
                document.head.appendChild(el);
            }

            // Inject custom script
            if (data.custom_script) {
                const wrapper = document.createElement("div");
                wrapper.innerHTML = data.custom_script;
                wrapper.querySelectorAll("script").forEach((s) => {
                    const newScript = document.createElement("script");
                    if (s.src) { newScript.src = s.src; newScript.async = true; }
                    else newScript.innerHTML = s.innerHTML;
                    document.head.appendChild(newScript);
                });
            }

            // Wait 3 seconds then redirect
            setTimeout(() => {
                window.location.replace(normalizeUrl(data.destination_url));
            }, 3000);
        };

        fetchAndRedirect();
    }, [slug]);

    if (notFound) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", background: "#f9fafb" }}>
                <p style={{ color: "#374151", fontSize: "1.1rem", fontWeight: 600 }}>Link não encontrado</p>
                <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: 8 }}>Este redirect não existe ou foi removido.</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
            {/* Spinner */}
            <div style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "4px solid #f3f4f6",
                borderTop: "4px solid #f59e0b",
                animation: "spin 0.8s linear infinite",
            }} />
            <p style={{ marginTop: 20, color: "#6b7280", fontSize: "0.9rem", letterSpacing: "0.02em" }}>
                Redirecionando...
            </p>
            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
