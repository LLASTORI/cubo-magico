import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WhatsAppSettings } from './WhatsAppSettings';
import { WhatsAppAgentsManager } from './WhatsAppAgentsManager';
import { WhatsAppDepartmentsManager } from './WhatsAppDepartmentsManager';
import { MessageCircle, Users, Building2 } from 'lucide-react';

export function WhatsAppFullSettings() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="numbers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="numbers" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Números
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Departamentos
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Atendentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="numbers" className="mt-6">
          <WhatsAppSettings />
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <WhatsAppDepartmentsManager />
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <WhatsAppAgentsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
