import { cn } from '@/lib/utils';

interface BrandIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  id?: string; // For unique gradient IDs when multiple icons on same page
}

export function BrandIcon({ size = 'md', className, id = 'brandIcon' }: BrandIconProps) {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
    '2xl': 'h-12 w-12',
  };

  return (
    <svg 
      className={cn(sizeClasses[size], className)} 
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}Gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:"#10b981", stopOpacity:1}} />
          <stop offset="50%" style={{stopColor:"#059669", stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:"#047857", stopOpacity:1}} />
        </linearGradient>
      </defs>
      
      {/* Main circular background */}
      <circle cx="22" cy="22" r="22" fill={`url(#${id}Gradient)`} />
      
      {/* Wheat stalks - stylized agricultural symbol */}
      <g fill="white" opacity="0.95">
        {/* Center stalk */}
        <path 
          d="M22 10 L22 34 M20 12 L24 12 M19 15 L25 15 M18 18 L26 18 M19 21 L25 21 M20 24 L24 24 M21 27 L23 27" 
          stroke="white" 
          strokeWidth="1.5" 
          strokeLinecap="round"
        />
        
        {/* Left wheat grains */}
        <circle cx="16" cy="14" r="1.5"/>
        <circle cx="15" cy="17" r="1.5"/>
        <circle cx="16" cy="20" r="1.5"/>
        <circle cx="17" cy="23" r="1.5"/>
        
        {/* Right wheat grains */}
        <circle cx="28" cy="14" r="1.5"/>
        <circle cx="29" cy="17" r="1.5"/>
        <circle cx="28" cy="20" r="1.5"/>
        <circle cx="27" cy="23" r="1.5"/>
        
        {/* Center grains */}
        <circle cx="22" cy="16" r="1"/>
        <circle cx="22" cy="19" r="1"/>
        <circle cx="22" cy="22" r="1"/>
        <circle cx="22" cy="25" r="1"/>
      </g>
      
      {/* Subtle highlight */}
      <circle cx="22" cy="22" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    </svg>
  );
}