import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { PerformanceStatus, getStatusBgClass, getStatusColor } from '@/lib/trafficMetrics';

interface PerformanceIndicatorProps {
  status: PerformanceStatus;
  showLabel?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}

export default function PerformanceIndicator({
  status,
  showLabel = true,
  showIcon = true,
  size = 'md',
  tooltip,
}: PerformanceIndicatorProps) {
  const labels = {
    green: 'Bom',
    yellow: 'Atencao',
    red: 'Critico',
  };

  const icons = {
    green: <CheckCircle className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />,
    yellow: <AlertTriangle className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />,
    red: <XCircle className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />,
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const indicator = (
    <Badge variant="outline" className={`${getStatusBgClass(status)} ${sizeClasses[size]}`}>
      <div className="flex items-center gap-1">
        {showIcon && icons[status]}
        {showLabel && <span>{labels[status]}</span>}
      </div>
    </Badge>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{indicator}</TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return indicator;
}

// Compact dot indicator for tables
export function StatusDot({ status }: { status: PerformanceStatus }) {
  return (
    <div
      className="h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: getStatusColor(status) }}
    />
  );
}

// Progress bar with status color
export function StatusProgressBar({
  value,
  max,
  status,
}: {
  value: number;
  max: number;
  status: PerformanceStatus;
}) {
  const percent = Math.min((value / max) * 100, 100);

  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${percent}%`,
          backgroundColor: getStatusColor(status),
        }}
      />
    </div>
  );
}
