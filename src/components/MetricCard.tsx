import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

const MetricCard = ({ title, value, icon: Icon, trend, trendUp }: MetricCardProps) => {
  return (
    <Card className="p-6 transition-all duration-300 hover:shadow-[var(--shadow-elegant)] border-border bg-gradient-to-br from-card to-secondary/30">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {value}
          </p>
          {trend && (
            <p className={`text-sm ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-accent">
          <Icon className="w-6 h-6 text-primary-foreground" />
        </div>
      </div>
    </Card>
  );
};

export default MetricCard;
