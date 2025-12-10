import React, { useState, useEffect } from 'react';

interface RubiksCube3DProps {
  size?: number;
  className?: string;
}

export const RubiksCube3D: React.FC<RubiksCube3DProps> = ({ 
  size = 100,
  className = '' 
}) => {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Stop animation after one full rotation (2 seconds)
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const cellSize = size / 3;
  const cubeSize = size;
  const gap = 2;

  const colors = {
    front: ['bg-cube-blue', 'bg-cube-red', 'bg-cube-green', 'bg-cube-yellow', 'bg-cube-white', 'bg-cube-orange', 'bg-cube-red', 'bg-cube-blue', 'bg-cube-green'],
    back: ['bg-cube-green', 'bg-cube-orange', 'bg-cube-yellow', 'bg-cube-blue', 'bg-cube-white', 'bg-cube-red', 'bg-cube-yellow', 'bg-cube-green', 'bg-cube-orange'],
    right: ['bg-cube-red', 'bg-cube-green', 'bg-cube-blue', 'bg-cube-orange', 'bg-cube-yellow', 'bg-cube-white', 'bg-cube-blue', 'bg-cube-red', 'bg-cube-yellow'],
    left: ['bg-cube-orange', 'bg-cube-blue', 'bg-cube-red', 'bg-cube-white', 'bg-cube-green', 'bg-cube-yellow', 'bg-cube-green', 'bg-cube-orange', 'bg-cube-white'],
    top: ['bg-cube-white', 'bg-cube-yellow', 'bg-cube-orange', 'bg-cube-green', 'bg-cube-blue', 'bg-cube-red', 'bg-cube-yellow', 'bg-cube-white', 'bg-cube-blue'],
    bottom: ['bg-cube-yellow', 'bg-cube-white', 'bg-cube-green', 'bg-cube-red', 'bg-cube-orange', 'bg-cube-blue', 'bg-cube-orange', 'bg-cube-yellow', 'bg-cube-red'],
  };

  const renderFace = (faceColors: string[]) => (
    <div 
      className="absolute grid grid-cols-3 gap-[2px] p-[3px] bg-foreground/20 rounded-sm"
      style={{ width: cubeSize, height: cubeSize }}
    >
      {faceColors.map((color, i) => (
        <div 
          key={i} 
          className={`${color} rounded-[2px] shadow-inner`}
          style={{ width: cellSize - gap, height: cellSize - gap }}
        />
      ))}
    </div>
  );

  return (
    <div 
      className={`relative ${className}`}
      style={{ 
        width: cubeSize, 
        height: cubeSize,
        perspective: '500px',
      }}
    >
      <div 
        className="relative w-full h-full"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isAnimating ? undefined : 'rotateX(-20deg) rotateY(-30deg)',
          animation: isAnimating ? 'cubeIntro 2s ease-out forwards' : 'none',
        }}
      >
        {/* Front face */}
        <div 
          className="absolute"
          style={{ transform: `translateZ(${cubeSize / 2}px)` }}
        >
          {renderFace(colors.front)}
        </div>
        
        {/* Back face */}
        <div 
          className="absolute"
          style={{ transform: `rotateY(180deg) translateZ(${cubeSize / 2}px)` }}
        >
          {renderFace(colors.back)}
        </div>
        
        {/* Right face */}
        <div 
          className="absolute"
          style={{ transform: `rotateY(90deg) translateZ(${cubeSize / 2}px)` }}
        >
          {renderFace(colors.right)}
        </div>
        
        {/* Left face */}
        <div 
          className="absolute"
          style={{ transform: `rotateY(-90deg) translateZ(${cubeSize / 2}px)` }}
        >
          {renderFace(colors.left)}
        </div>
        
        {/* Top face */}
        <div 
          className="absolute"
          style={{ transform: `rotateX(90deg) translateZ(${cubeSize / 2}px)` }}
        >
          {renderFace(colors.top)}
        </div>
        
        {/* Bottom face */}
        <div 
          className="absolute"
          style={{ transform: `rotateX(-90deg) translateZ(${cubeSize / 2}px)` }}
        >
          {renderFace(colors.bottom)}
        </div>
      </div>
    </div>
  );
};
