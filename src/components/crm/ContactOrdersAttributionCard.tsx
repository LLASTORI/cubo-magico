import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Target, Megaphone, Hash, MousePointer } from 'lucide-react';
import { useContactOrdersAttribution } from '@/hooks/useContactOrdersAttribution';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 🚫 LEGACY TABLES FORBIDDEN
 * This component uses ONLY Orders Core views:
 * - crm_contact_attribution_view
 * 
 * DO NOT USE: crm_contacts.first_utm_*
 */

interface ContactOrdersAttributionCardProps {
  projectId: string;
  buyerEmail: string;
}

export function ContactOrdersAttributionCard({ projectId, buyerEmail }: ContactOrdersAttributionCardProps) {
  const { data: attribution, isLoading } = useContactOrdersAttribution(projectId, buyerEmail);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!attribution) {
    return null;
  }

  const hasUtmData = attribution.utm_source || attribution.utm_placement;
  const hasMetaIds = attribution.meta_campaign_id || attribution.meta_adset_id || attribution.meta_ad_id;

  if (!hasUtmData && !hasMetaIds) {
    return null;
  }

  // Parse raw_sck for additional UTM data if available
  // Format: source|campaign|adset|term|ad
  const sckParts = attribution.raw_sck?.split('|') || [];
  const utmCampaign = sckParts[1] || null;
  const utmAdset = sckParts[2] || null;
  const utmTerm = sckParts[3] || null;
  const utmAd = sckParts[4] || null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Atribuição (Orders Core)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* UTMs Principais */}
        {hasUtmData && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Megaphone className="h-3 w-3" />
              UTMs (Primeiro Pedido)
            </div>
            <div className="space-y-1.5 text-sm">
              {attribution.utm_source && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Source:</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {attribution.utm_source}
                  </Badge>
                </div>
              )}
              {utmCampaign && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Campaign:</span>
                  <span className="text-xs font-medium truncate max-w-[140px]" title={utmCampaign}>
                    {utmCampaign}
                  </span>
                </div>
              )}
              {attribution.utm_placement && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Placement:</span>
                  <span className="text-xs truncate max-w-[140px]" title={attribution.utm_placement}>
                    {attribution.utm_placement}
                  </span>
                </div>
              )}
              {utmTerm && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Term:</span>
                  <span className="text-xs truncate max-w-[140px]" title={utmTerm}>
                    {utmTerm}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detalhes do Anúncio */}
        {(utmAdset || utmAd) && (
          <>
            {hasUtmData && <Separator />}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <MousePointer className="h-3 w-3" />
                Detalhes do Anúncio
              </div>
              <div className="space-y-1.5 text-sm">
                {utmAdset && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Adset:</span>
                    <span className="text-xs truncate max-w-[140px]" title={utmAdset}>
                      {utmAdset}
                    </span>
                  </div>
                )}
                {utmAd && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Ad:</span>
                    <span className="text-xs truncate max-w-[140px]" title={utmAd}>
                      {utmAd}
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
            {(hasUtmData || utmAdset || utmAd) && <Separator />}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Hash className="h-3 w-3" />
                Meta IDs (Rastreio)
              </div>
              <div className="space-y-1.5 text-sm">
                {attribution.meta_campaign_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Campaign ID:</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[140px]" title={attribution.meta_campaign_id}>
                      {attribution.meta_campaign_id}
                    </code>
                  </div>
                )}
                {attribution.meta_adset_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Adset ID:</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[140px]" title={attribution.meta_adset_id}>
                      {attribution.meta_adset_id}
                    </code>
                  </div>
                )}
                {attribution.meta_ad_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Ad ID:</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[140px]" title={attribution.meta_ad_id}>
                      {attribution.meta_ad_id}
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
