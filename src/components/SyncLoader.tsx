import React, { useState, useEffect } from 'react';
import { CubeLoader } from './CubeLoader';
import { Progress } from '@/components/ui/progress';

const CUBE_MESSAGES = [
  // Referências ao Cubo Mágico
  "Girando as peças do Cubo... 🎯",
  "Montando os dados como um speedcuber! ⚡",
  "Resolvendo o algoritmo dos seus anúncios...",
  "Alinhando as cores certas para você...",
  "Esse Cubo tem muitas peças... quase lá!",
  "Organizando as faces do seu dashboard...",
  "Encaixando cada métrica no lugar certo...",
  "Até um cubo mágico leva tempo para montar...",
  "Girando R U R' U' nos seus dados...",
  "Paciência! Nem o recorde mundial foi instantâneo...",
  "Seus dados estão fazendo um F2L perfeito...",
  "Cross feito! Agora vem a parte boa...",
  "Último layer... só mais um pouco!",
  "Cada cor no seu lugar, cada dado alinhado...",
  
  // Referências técnicas do Cubo
  "Executando algoritmo OLL nos seus dados...",
  "PLL aplicado! Finalizando a sincronização...",
  "Método CFOP em ação nos seus anúncios...",
  "Speedcubing seus insights em tempo real...",
  "Fazendo um look-ahead nos próximos dados...",
  
  // Frases motivacionais com tema Cubo
  "O Cubo está trabalhando pra você! 🧊",
  "Cada giro nos aproxima do resultado...",
  "A magia do Cubo está acontecendo...",
  "Scramble dos dados sendo resolvido...",
  "Seu dashboard está sendo montado peça por peça...",
  
  // Frases divertidas
  "Enquanto isso, um speedcuber já resolveu 3 cubos...",
  "Não se preocupe, nosso Cubo é mais esperto!",
  "Os dados estão dançando como peças coloridas...",
  "Organizando o caos como só um Cubo sabe fazer...",
  "Girando, girando... resultados chegando!",
  
  // Frases de progresso
  "Camadas superiores alinhadas! Avançando...",
  "Centro encontrado! Agora vem o resto...",
  "Cantos posicionados! Métricas se encaixando...",
  "Arestas organizadas! Quase terminando...",
  "Algoritmo final em execução...",
];

interface SyncLoaderProps {
  className?: string;
  showProgress?: boolean;
  estimatedDuration?: number; // in seconds
}

export const SyncLoader: React.FC<SyncLoaderProps> = ({ 
  className,
  showProgress = true,
  estimatedDuration = 60
}) => {
  const [messageIndex, setMessageIndex] = useState(() => 
    Math.floor(Math.random() * CUBE_MESSAGES.length)
  );
  const [progress, setProgress] = useState(0);
  const [startTime] = useState(() => Date.now());

  // Rotate messages every 5 seconds (increased from 3)
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        // Pick a random message that's different from current
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * CUBE_MESSAGES.length);
        } while (newIndex === prev && CUBE_MESSAGES.length > 1);
        return newIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Update progress based on elapsed time
  useEffect(() => {
    if (!showProgress) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const newProgress = Math.min(95, (elapsed / estimatedDuration) * 100);
      setProgress(newProgress);
    }, 500);

    return () => clearInterval(interval);
  }, [startTime, estimatedDuration, showProgress]);

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <CubeLoader size="sm" message="" />
      <div className="flex-1 space-y-2">
        <div>
          <p className="font-medium text-foreground">Sincronizando dados...</p>
          <p className="text-sm text-muted-foreground transition-all duration-500 min-h-[1.25rem]">
            {CUBE_MESSAGES[messageIndex]}
          </p>
        </div>
        {showProgress && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground/70">
              {progress < 30 && "Preparando conexão com Meta..."}
              {progress >= 30 && progress < 60 && "Buscando dados das campanhas..."}
              {progress >= 60 && progress < 85 && "Processando métricas..."}
              {progress >= 85 && "Finalizando sincronização..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
