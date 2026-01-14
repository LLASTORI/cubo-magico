import React, { useState } from 'react';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';

interface CuboLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  interactive?: boolean;
}

export const CuboLogo: React.FC<CuboLogoProps> = ({ 
  className = '', 
  size = 'md',
  animated = false,
  interactive = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isInitialAnimation, setIsInitialAnimation] = useState(true);
  const [colorIndex, setColorIndex] = useState(0);
  
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40',
  };

  // Color patterns - cycle through during animation
  const colorPatterns = [
    ['bg-cube-blue', 'bg-cube-red', 'bg-cube-green', 'bg-cube-yellow', 'bg-cube-white', 'bg-cube-orange', 'bg-cube-red', 'bg-cube-blue', 'bg-cube-green'],
    ['bg-cube-orange', 'bg-cube-green', 'bg-cube-yellow', 'bg-cube-blue', 'bg-cube-white', 'bg-cube-red', 'bg-cube-green', 'bg-cube-yellow', 'bg-cube-blue'],
    ['bg-cube-red', 'bg-cube-yellow', 'bg-cube-blue', 'bg-cube-green', 'bg-cube-white', 'bg-cube-orange', 'bg-cube-yellow', 'bg-cube-red', 'bg-cube-orange'],
    ['bg-cube-green', 'bg-cube-blue', 'bg-cube-orange', 'bg-cube-red', 'bg-cube-white', 'bg-cube-yellow', 'bg-cube-blue', 'bg-cube-green', 'bg-cube-red'],
  ];

  // Animate colors during initial animation
  React.useEffect(() => {
    if (!interactive) return;
    
    // Cycle colors during initial 3 seconds
    const colorInterval = setInterval(() => {
      setColorIndex(prev => (prev + 1) % colorPatterns.length);
    }, 500);

    // Stop after 3 seconds
    const stopTimer = setTimeout(() => {
      setIsInitialAnimation(false);
      clearInterval(colorInterval);
      setColorIndex(0);
    }, 3000);

    return () => {
      clearInterval(colorInterval);
      clearTimeout(stopTimer);
    };
  }, [interactive]);

  const colors = isHovered 
    ? colorPatterns[1] 
    : isInitialAnimation 
      ? colorPatterns[colorIndex] 
      : colorPatterns[0];

  return (
    <div 
      className={`relative ${sizeMap[size]} ${className}`}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
    >
      {/* 3D Cube representation using CSS */}
      <div 
        className={`
          relative w-full h-full transition-transform duration-500 ease-out
          ${animated ? 'animate-cube-rotate' : ''}
          ${isHovered ? 'rotate-[15deg] scale-110' : ''}
        `}
        style={{ 
          transformStyle: 'preserve-3d',
          perspective: '200px',
        }}
      >
        {/* Grid pattern representing cube face */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 p-0.5 bg-foreground/10 rounded-lg overflow-hidden">
          {colors.map((color, i) => (
            <div 
              key={i}
              className={`${color} rounded-sm transition-all duration-300 ${i === 4 ? 'border border-foreground/10' : ''}`}
              style={{ 
                transitionDelay: `${i * 30}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface CuboBrandProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CuboBrand: React.FC<CuboBrandProps> = ({ 
  className = '', 
  showText = true,
  size = 'md' 
}) => {
  const { navigateTo } = useProjectNavigation();
  
  const textSizeMap = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div 
      className={`flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      onClick={() => navigateTo('/dashboard')}
    >
      <CuboLogo size={size} interactive />
      {showText && (
        <span className={`font-display font-bold ${textSizeMap[size]} text-foreground`}>
          Cubo Mágico
        </span>
      )}
    </div>
  );
};
