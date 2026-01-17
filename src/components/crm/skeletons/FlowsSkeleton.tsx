/**
 * Skeleton imediato para Mapa de Ascensão
 * PROMPT 31: Renderização progressiva - header/filtros primeiro
 */
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function FlowsSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in-0 duration-200">
      {/* Filtros - aparecem primeiro */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-10 w-44" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
            <Skeleton className="h-4 w-32 ml-auto" />
          </div>
        </CardContent>
      </Card>

      {/* Container do gráfico */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-36" />
          </div>
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          {/* Step labels */}
          <div className="flex mb-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 flex justify-center">
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
          
          {/* Sankey placeholder */}
          <div className="border rounded-lg bg-muted/20 p-4 overflow-hidden" style={{ height: 420 }}>
            <div className="flex items-center justify-center h-full">
              <div className="flex gap-8">
                {[1, 2, 3, 4].map((col) => (
                  <div key={col} className="flex flex-col gap-3">
                    {[1, 2, 3].map((node) => (
                      <Skeleton 
                        key={node} 
                        className="w-32 rounded-md" 
                        style={{ height: 60 + (node * 15) }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="w-3 h-3 rounded-sm" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights placeholder */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
