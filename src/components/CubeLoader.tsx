import React from 'react';

interface CubeLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CubeLoader: React.FC<CubeLoaderProps> = ({ 
  message = 'Carregando...', 
  size = 'md' 
}) => {
  const sizeMap = {
    sm: { cube: 40, face: 12 },
    md: { cube: 60, face: 18 },
    lg: { cube: 80, face: 24 },
  };

  const { cube, face } = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* 3D Cube Container */}
      <div 
        className="relative"
        style={{ 
          width: cube, 
          height: cube,
          perspective: '200px',
        }}
      >
        <div 
          className="absolute w-full h-full animate-cube-spin"
          style={{ 
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Front face */}
          <div 
            className="absolute grid grid-cols-3 grid-rows-3 gap-0.5 p-0.5 bg-foreground/20 rounded"
            style={{ 
              width: cube, 
              height: cube,
              transform: `translateZ(${cube/2}px)`,
            }}
          >
            <div className="bg-cube-blue rounded-sm" />
            <div className="bg-cube-red rounded-sm" />
            <div className="bg-cube-green rounded-sm" />
            <div className="bg-cube-yellow rounded-sm" />
            <div className="bg-cube-white rounded-sm border border-foreground/10" />
            <div className="bg-cube-orange rounded-sm" />
            <div className="bg-cube-red rounded-sm" />
            <div className="bg-cube-blue rounded-sm" />
            <div className="bg-cube-green rounded-sm" />
          </div>
          
          {/* Back face */}
          <div 
            className="absolute grid grid-cols-3 grid-rows-3 gap-0.5 p-0.5 bg-foreground/20 rounded"
            style={{ 
              width: cube, 
              height: cube,
              transform: `translateZ(-${cube/2}px) rotateY(180deg)`,
            }}
          >
            <div className="bg-cube-green rounded-sm" />
            <div className="bg-cube-orange rounded-sm" />
            <div className="bg-cube-blue rounded-sm" />
            <div className="bg-cube-yellow rounded-sm" />
            <div className="bg-cube-white rounded-sm border border-foreground/10" />
            <div className="bg-cube-red rounded-sm" />
            <div className="bg-cube-blue rounded-sm" />
            <div className="bg-cube-green rounded-sm" />
            <div className="bg-cube-orange rounded-sm" />
          </div>
          
          {/* Right face */}
          <div 
            className="absolute grid grid-cols-3 grid-rows-3 gap-0.5 p-0.5 bg-foreground/20 rounded"
            style={{ 
              width: cube, 
              height: cube,
              transform: `rotateY(90deg) translateZ(${cube/2}px)`,
            }}
          >
            <div className="bg-cube-orange rounded-sm" />
            <div className="bg-cube-orange rounded-sm" />
            <div className="bg-cube-orange rounded-sm" />
            <div className="bg-cube-orange rounded-sm" />
            <div className="bg-cube-orange rounded-sm" />
            <div className="bg-cube-orange rounded-sm" />
            <div className="bg-cube-orange rounded-sm" />
            <div className="bg-cube-orange rounded-sm" />
            <div className="bg-cube-orange rounded-sm" />
          </div>
          
          {/* Left face */}
          <div 
            className="absolute grid grid-cols-3 grid-rows-3 gap-0.5 p-0.5 bg-foreground/20 rounded"
            style={{ 
              width: cube, 
              height: cube,
              transform: `rotateY(-90deg) translateZ(${cube/2}px)`,
            }}
          >
            <div className="bg-cube-red rounded-sm" />
            <div className="bg-cube-red rounded-sm" />
            <div className="bg-cube-red rounded-sm" />
            <div className="bg-cube-red rounded-sm" />
            <div className="bg-cube-red rounded-sm" />
            <div className="bg-cube-red rounded-sm" />
            <div className="bg-cube-red rounded-sm" />
            <div className="bg-cube-red rounded-sm" />
            <div className="bg-cube-red rounded-sm" />
          </div>
          
          {/* Top face */}
          <div 
            className="absolute grid grid-cols-3 grid-rows-3 gap-0.5 p-0.5 bg-foreground/20 rounded"
            style={{ 
              width: cube, 
              height: cube,
              transform: `rotateX(90deg) translateZ(${cube/2}px)`,
            }}
          >
            <div className="bg-cube-yellow rounded-sm" />
            <div className="bg-cube-yellow rounded-sm" />
            <div className="bg-cube-yellow rounded-sm" />
            <div className="bg-cube-yellow rounded-sm" />
            <div className="bg-cube-yellow rounded-sm" />
            <div className="bg-cube-yellow rounded-sm" />
            <div className="bg-cube-yellow rounded-sm" />
            <div className="bg-cube-yellow rounded-sm" />
            <div className="bg-cube-yellow rounded-sm" />
          </div>
          
          {/* Bottom face */}
          <div 
            className="absolute grid grid-cols-3 grid-rows-3 gap-0.5 p-0.5 bg-foreground/20 rounded"
            style={{ 
              width: cube, 
              height: cube,
              transform: `rotateX(-90deg) translateZ(${cube/2}px)`,
            }}
          >
            <div className="bg-cube-white rounded-sm border border-foreground/10" />
            <div className="bg-cube-white rounded-sm border border-foreground/10" />
            <div className="bg-cube-white rounded-sm border border-foreground/10" />
            <div className="bg-cube-white rounded-sm border border-foreground/10" />
            <div className="bg-cube-white rounded-sm border border-foreground/10" />
            <div className="bg-cube-white rounded-sm border border-foreground/10" />
            <div className="bg-cube-white rounded-sm border border-foreground/10" />
            <div className="bg-cube-white rounded-sm border border-foreground/10" />
            <div className="bg-cube-white rounded-sm border border-foreground/10" />
          </div>
        </div>
      </div>
      
      {/* Loading message */}
      {message && (
        <p className="text-muted-foreground text-sm animate-pulse">{message}</p>
      )}
    </div>
  );
};
