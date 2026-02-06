import { forwardRef } from "react";

interface CampoFutebolProps {
  children?: React.ReactNode;
  className?: string;
}

export const CampoFutebol = forwardRef<HTMLDivElement, CampoFutebolProps>(
  ({ children, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative w-full overflow-hidden rounded-2xl border-2 border-green-700 shadow-lg ${className}`}
        style={{ aspectRatio: "3 / 2" }}
      >
        {/* SVG Field Background */}
        <svg
          viewBox="0 0 600 400"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Grass background with gradient */}
          <defs>
            <linearGradient id="grass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2d8a4e" />
              <stop offset="50%" stopColor="#34a853" />
              <stop offset="100%" stopColor="#2d8a4e" />
            </linearGradient>
            {/* Grass stripe pattern */}
            <pattern id="grassStripes" width="60" height="400" patternUnits="userSpaceOnUse">
              <rect width="30" height="400" fill="rgba(255,255,255,0.03)" />
            </pattern>
          </defs>

          {/* Main grass */}
          <rect width="600" height="400" fill="url(#grass)" />
          <rect width="600" height="400" fill="url(#grassStripes)" />

          {/* Field lines - white with slight transparency */}
          <g stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none">
            {/* Outer boundary */}
            <rect x="30" y="20" width="540" height="360" rx="2" />

            {/* Center line */}
            <line x1="300" y1="20" x2="300" y2="380" />

            {/* Center circle */}
            <circle cx="300" cy="200" r="60" />

            {/* Center dot */}
            <circle cx="300" cy="200" r="3" fill="rgba(255,255,255,0.7)" />

            {/* Left penalty area */}
            <rect x="30" y="100" width="100" height="200" />

            {/* Left goal area */}
            <rect x="30" y="150" width="40" height="100" />

            {/* Left penalty dot */}
            <circle cx="100" cy="200" r="3" fill="rgba(255,255,255,0.7)" />

            {/* Left penalty arc */}
            <path d="M 130 165 A 60 60 0 0 1 130 235" />

            {/* Right penalty area */}
            <rect x="470" y="100" width="100" height="200" />

            {/* Right goal area */}
            <rect x="530" y="150" width="40" height="100" />

            {/* Right penalty dot */}
            <circle cx="500" cy="200" r="3" fill="rgba(255,255,255,0.7)" />

            {/* Right penalty arc */}
            <path d="M 470 165 A 60 60 0 0 0 470 235" />

            {/* Corner arcs */}
            <path d="M 30 30 A 10 10 0 0 1 40 20" />
            <path d="M 560 20 A 10 10 0 0 1 570 30" />
            <path d="M 570 370 A 10 10 0 0 1 560 380" />
            <path d="M 40 380 A 10 10 0 0 1 30 370" />

            {/* Goals */}
            <rect x="18" y="170" width="12" height="60" strokeWidth="1.5" />
            <rect x="570" y="170" width="12" height="60" strokeWidth="1.5" />
          </g>
        </svg>

        {/* Children (player cards) are positioned absolutely over the SVG */}
        {children}
      </div>
    );
  }
);

CampoFutebol.displayName = "CampoFutebol";
