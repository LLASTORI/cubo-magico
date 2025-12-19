import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Target, Link2, Megaphone, Hash, Eye, MousePointer } from 'lucide-react';

interface ContactAttributionCardProps {
  contact: {
    first_utm_source?: string | null;
    first_utm_campaign?: string | null;
    first_utm_medium?: string | null;
    first_utm_content?: string | null;
    first_utm_term?: string | null;
    first_utm_adset?: string | null;
    first_utm_ad?: string | null;
    first_utm_creative?: string | null;
    first_utm_placement?: string | null;
    first_meta_campaign_id?: string | null;
    first_meta_adset_id?: string | null;
    first_meta_ad_id?: string | null;
  };
}

export function ContactAttributionCard({ contact }: ContactAttributionCardProps) {
  const hasUtmData = contact.first_utm_source || contact.first_utm_campaign || contact.first_utm_medium;
  const hasMetaIds = contact.first_meta_campaign_id || contact.first_meta_adset_id || contact.first_meta_ad_id;
  const hasAdvancedUtm = contact.first_utm_adset || contact.first_utm_ad || contact.first_utm_creative || contact.first_utm_placement;

  if (!hasUtmData && !hasMetaIds && !hasAdvancedUtm) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Atribuição Completa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* UTMs Principais */}
        {hasUtmData && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Megaphone className="h-3 w-3" />
              UTMs Principais
            </div>
            <div className="space-y-1.5 text-sm">
              {contact.first_utm_source && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Source:</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {contact.first_utm_source}
                  </Badge>
                </div>
              )}
              {contact.first_utm_medium && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Medium:</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {contact.first_utm_medium}
                  </Badge>
                </div>
              )}
              {contact.first_utm_campaign && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Campaign:</span>
                  <span className="text-xs font-medium truncate max-w-[140px]" title={contact.first_utm_campaign}>
                    {contact.first_utm_campaign}
                  </span>
                </div>
              )}
              {contact.first_utm_content && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Content:</span>
                  <span className="text-xs truncate max-w-[140px]" title={contact.first_utm_content}>
                    {contact.first_utm_content}
                  </span>
                </div>
              )}
              {contact.first_utm_term && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Term:</span>
                  <span className="text-xs truncate max-w-[140px]" title={contact.first_utm_term}>
                    {contact.first_utm_term}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* UTMs Avançados */}
        {hasAdvancedUtm && (
          <>
            {hasUtmData && <Separator />}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <MousePointer className="h-3 w-3" />
                Detalhes do Anúncio
              </div>
              <div className="space-y-1.5 text-sm">
                {contact.first_utm_adset && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Adset:</span>
                    <span className="text-xs truncate max-w-[140px]" title={contact.first_utm_adset}>
                      {contact.first_utm_adset}
                    </span>
                  </div>
                )}
                {contact.first_utm_ad && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Ad:</span>
                    <span className="text-xs truncate max-w-[140px]" title={contact.first_utm_ad}>
                      {contact.first_utm_ad}
                    </span>
                  </div>
                )}
                {contact.first_utm_creative && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Creative:</span>
                    <span className="text-xs truncate max-w-[140px]" title={contact.first_utm_creative}>
                      {contact.first_utm_creative}
                    </span>
                  </div>
                )}
                {contact.first_utm_placement && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Placement:</span>
                    <span className="text-xs truncate max-w-[140px]" title={contact.first_utm_placement}>
                      {contact.first_utm_placement}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Meta IDs */}
        {hasMetaIds && (
          <>
            {(hasUtmData || hasAdvancedUtm) && <Separator />}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Hash className="h-3 w-3" />
                Meta IDs (Rastreio)
              </div>
              <div className="space-y-1.5 text-sm">
                {contact.first_meta_campaign_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Campaign ID:</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                      {contact.first_meta_campaign_id}
                    </code>
                  </div>
                )}
                {contact.first_meta_adset_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Adset ID:</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                      {contact.first_meta_adset_id}
                    </code>
                  </div>
                )}
                {contact.first_meta_ad_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Ad ID:</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                      {contact.first_meta_ad_id}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
