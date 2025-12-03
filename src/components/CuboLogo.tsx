import React from 'react';

interface CuboLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const CuboLogo: React.FC<CuboLogoProps> = ({ 
  className = '', 
  size = 'md',
  animated = false 
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  return (
    <div className={`relative ${sizeMap[size]} ${className}`}>
      {/* 3D Cube representation using CSS */}
      <div 
        className={`
          relative w-full h-full
          ${animated ? 'animate-cube-rotate' : ''}
        `}
        style={{ 
          transformStyle: 'preserve-3d',
          perspective: '200px',
        }}
      >
        {/* Grid pattern representing cube face */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 p-0.5 bg-foreground/10 rounded-lg overflow-hidden">
          {/* Row 1 */}
          <div className="bg-cube-blue rounded-sm" />
          <div className="bg-cube-red rounded-sm" />
          <div className="bg-cube-green rounded-sm" />
          {/* Row 2 */}
          <div className="bg-cube-yellow rounded-sm" />
          <div className="bg-cube-white rounded-sm border border-foreground/10" />
          <div className="bg-cube-orange rounded-sm" />
          {/* Row 3 */}
          <div className="bg-cube-red rounded-sm" />
          <div className="bg-cube-blue rounded-sm" />
          <div className="bg-cube-green rounded-sm" />
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
  const textSizeMap = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <CuboLogo size={size} />
      {showText && (
        <span className={`font-display font-bold ${textSizeMap[size]} text-foreground`}>
          Cubo Mágico
        </span>
      )}
    </div>
  );
};
