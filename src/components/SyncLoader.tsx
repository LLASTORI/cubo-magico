import React, { useState, useEffect } from 'react';
import { CubeLoader } from './CubeLoader';

const CUBE_MESSAGES = [
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
];

interface SyncLoaderProps {
  className?: string;
}

export const SyncLoader: React.FC<SyncLoaderProps> = ({ className }) => {
  const [messageIndex, setMessageIndex] = useState(() => 
    Math.floor(Math.random() * CUBE_MESSAGES.length)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % CUBE_MESSAGES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <CubeLoader size="sm" message="" />
      <div className="flex-1">
        <p className="font-medium text-foreground">Sincronizando dados...</p>
        <p className="text-sm text-muted-foreground animate-pulse transition-all duration-300">
          {CUBE_MESSAGES[messageIndex]}
        </p>
      </div>
    </div>
  );
};
