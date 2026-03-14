import { useEffect } from "react";
import { useTenantNavigation } from "@/navigation";
import { useToast } from "@/hooks/use-toast";

const SalesHistory = () => {
  const { navigateTo } = useTenantNavigation();
  const { toast } = useToast();

  useEffect(() => {
    toast({
      title: "Página movida",
      description: "A importação de histórico foi movida para Configurações → Integrações → Hotmart.",
    });
    navigateTo('/settings');
  }, []);

  return null;
};

export default SalesHistory;
