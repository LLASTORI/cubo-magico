import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { CuboLogo } from "@/components/CuboLogo";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HeroSectionProps {
  startDate: string;
  endDate: string;
}

export const HeroSection = ({ startDate, endDate }: HeroSectionProps) => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  
  // Get first name from user metadata or email
  const getFirstName = () => {
    const fullName = user?.user_metadata?.full_name;
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

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[var(--gradient-hero)] p-8 md:p-12">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[hsl(var(--cyan-accent))] rounded-full blur-[128px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary rounded-full blur-[96px] translate-y-1/2 -translate-x-1/2" />
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left content */}
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(var(--cyan-accent))]/20 text-[hsl(var(--cyan-accent))] text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--cyan-accent))] animate-pulse" />
            {currentProject?.name}
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
            {getGreeting()}, <span className="text-[hsl(var(--cyan-accent))]">{getFirstName()}</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 italic mb-6">
            O sistema de funis que trabalha por você.
          </p>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-white/60">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Período: {format(new Date(startDate), "dd MMM", { locale: ptBR })} - {format(new Date(endDate), "dd MMM yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>

        {/* Right content - Cube */}
        <div className="relative">
          <div className="relative w-32 h-32 md:w-40 md:h-40">
            <CuboLogo size="lg" animated className="w-full h-full" />
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-[hsl(var(--cyan-accent))]/20 blur-2xl rounded-full" />
        </div>
      </div>
    </section>
  );
};
