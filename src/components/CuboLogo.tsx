import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40',
  };

  // Color patterns - shuffle on hover
  const defaultColors = [
    'bg-cube-blue', 'bg-cube-red', 'bg-cube-green',
    'bg-cube-yellow', 'bg-cube-white', 'bg-cube-orange',
    'bg-cube-red', 'bg-cube-blue', 'bg-cube-green'
  ];
  
  const hoveredColors = [
    'bg-cube-orange', 'bg-cube-green', 'bg-cube-yellow',
    'bg-cube-blue', 'bg-cube-white', 'bg-cube-red',
    'bg-cube-green', 'bg-cube-yellow', 'bg-cube-blue'
  ];

  const colors = isHovered ? hoveredColors : defaultColors;

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
  const navigate = useNavigate();
  
  const textSizeMap = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div 
      className={`flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      onClick={() => navigate('/')}
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
