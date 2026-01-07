import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { CuboLogo } from "@/components/CuboLogo";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HeroSectionProps {
  startDate: string;
  endDate: string;
}
export const HeroSection = ({
  startDate,
  endDate
}: HeroSectionProps) => {
  const {
    user
  } = useAuth();
  const {
    currentProject
  } = useProject();

  // Fetch profile to get the correct full_name
  const { data: profile } = useQuery({
    queryKey: ['profile-name', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const getFirstName = () => {
    // First try profile.full_name, then user_metadata, then email
    const fullName = profile?.full_name || user?.user_metadata?.full_name;
    if (fullName) {
      return fullName.split(' ')[0];
    }
    return user?.email?.split('@')[0] || 'Usuário';
  };
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };
  return <section className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 md:p-12">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan rounded-full blur-[128px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary rounded-full blur-[96px] translate-y-1/2 -translate-x-1/2" />
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left content */}
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/20 text-cyan text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
            {currentProject?.name}
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3" style={{
          color: 'hsl(var(--hero-text))'
        }}>
            {getGreeting()}, <span className="text-cyan">{getFirstName()}</span>
          </h1>
          
          <p className="text-lg md:text-xl italic mb-6" style={{
          color: 'hsl(var(--hero-text-muted))'
        }}>Funis que vendem. Dados que decidem.</p>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm" style={{
          color: 'hsl(var(--hero-text-muted))'
        }}>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Período: {format(new Date(startDate), "dd MMM", {
              locale: ptBR
            })} - {format(new Date(endDate), "dd MMM yyyy", {
              locale: ptBR
            })}
            </span>
          </div>
        </div>

        {/* Right content - Animated Cube Logo */}
        <div className="relative animate-hero-cube">
          <CuboLogo size="xl" interactive />
          {/* Glow effect */}
          <div className="absolute inset-0 bg-cyan/30 blur-3xl rounded-full -z-10 scale-150" />
        </div>
      </div>
    </section>;
};