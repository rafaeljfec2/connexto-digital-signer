import type { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip } from './tooltip';
import type { TooltipProps } from './tooltip';

export type LabelWithTooltipProps = {
  readonly label: string;
  readonly tooltip: string;
  readonly icon?: ReactNode;
  readonly required?: boolean;
  readonly tooltipPosition?: TooltipProps['position'];
  readonly htmlFor?: string;
  readonly size?: 'sm' | 'xs';
  readonly className?: string;
};

export function LabelWithTooltip({
  label,
  tooltip,
  icon,
  required,
  tooltipPosition = 'top',
  htmlFor,
  size = 'sm',
  className = '',
}: Readonly<LabelWithTooltipProps>) {
  const textSize = size === 'xs' ? 'text-xs' : 'text-sm';

  return (
    <label
      htmlFor={htmlFor}
      className={`flex items-center gap-2 ${textSize} font-medium text-foreground ${className}`}
    >
      {icon}
      {label}
      {required ? <span className="text-error">*</span> : null}
      <Tooltip content={tooltip} position={tooltipPosition}>
        <HelpCircle className="h-3.5 w-3.5 cursor-help text-foreground-subtle transition-colors hover:text-primary" />
      </Tooltip>
    </label>
  );
}
