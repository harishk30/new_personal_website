import React from 'react';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { ResponsiveContainer, Tooltip } from 'recharts';
import { X } from 'lucide-react';

export const Tabs = props => <BaseTabs.Root data-slot="tabs" {...props} />;
export const TabsList = ({ variant, ...props }) => <BaseTabs.List {...props} />;
export const TabsTrigger = props => <BaseTabs.Tab {...props} />;
export const TabsContent = props => <BaseTabs.Panel {...props} />;
export const Collapsible = BaseCollapsible.Root;
export const CollapsibleTrigger = BaseCollapsible.Trigger;
export const CollapsibleContent = BaseCollapsible.Panel;
export const Dialog = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;
export const DialogTitle = BaseDialog.Title;

export function DialogContent({ children, className = '', ...props }) {
  return <BaseDialog.Portal>
    <div className="worldbench-dialog-scope">
      <BaseDialog.Backdrop className="article-dialog-backdrop" />
      <BaseDialog.Popup className={`article-dialog ${className}`} {...props}>
        {children}
        <BaseDialog.Close className="article-dialog-close" aria-label="Close">
          <X size={20} aria-hidden="true" />
        </BaseDialog.Close>
      </BaseDialog.Popup>
    </div>
  </BaseDialog.Portal>;
}

export function ChartContainer({ config, children, ...props }) {
  return <div {...props}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

export const ChartTooltip = Tooltip;
export function ChartTooltipContent({ active, payload, label, labelFormatter, formatter, hideLabel, className }) {
  if (!active || !payload?.length) return null;
  return <div className={className}>
    {!hideLabel && <div>{labelFormatter ? labelFormatter(label, payload) : label}</div>}
    {payload.filter(item => item.type !== 'none').map((item, index) => <div key={item.dataKey}>
      {formatter ? formatter(item.value, item.name, item, index, payload) : `${item.name}: ${item.value}`}
    </div>)}
  </div>;
}
