import { cn } from '@/lib/utils.ts';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'minimal' | 'text-only' | 'icon-only';
  className?: string;
}

export function Logo({ size = 'md', variant = 'default', className }: LogoProps) {
  const sizeClasses = {
    sm: {
      icon: 'h-6 w-6',
      text: 'text-sm',
      subtext: 'text-xs',
      spacing: 'space-x-2'
    },
    md: {
      icon: 'h-8 w-8',
      text: 'text-lg',
      subtext: 'text-xs',
      spacing: 'space-x-3'
    },
    lg: {
      icon: 'h-12 w-12',
      text: 'text-xl',
      subtext: 'text-sm',
      spacing: 'space-x-4'
    },
    xl: {
      icon: 'h-16 w-16',
      text: 'text-3xl',
      subtext: 'text-base',
      spacing: 'space-x-6'
    }
  };

  const currentSize = sizeClasses[size];

  if (variant === 'text-only') {
    return (
      <div className={cn('flex items-center', className)}>
        <span className={cn('font-bold text-foreground', currentSize.text)}>
          KisaanCenter
        </span>
      </div>
    );
  }

  if (variant === 'icon-only') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <svg 
          className={cn(currentSize.icon)} 
          viewBox="0 0 44 44"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor:"#10b981", stopOpacity:1}} />
              <stop offset="50%" style={{stopColor:"#059669", stopOpacity:1}} />
              <stop offset="100%" style={{stopColor:"#047857", stopOpacity:1}} />
            </linearGradient>
          </defs>
          
          <circle cx="22" cy="22" r="22" fill="url(#iconGradient)" />
          
          <g fill="white" opacity="0.95">
            <path d="M22 10 L22 34 M20 12 L24 12 M19 15 L25 15 M18 18 L26 18 M19 21 L25 21 M20 24 L24 24 M21 27 L23 27" 
                  stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            
            <circle cx="16" cy="14" r="1.5"/>
            <circle cx="15" cy="17" r="1.5"/>
            <circle cx="16" cy="20" r="1.5"/>
            <circle cx="17" cy="23" r="1.5"/>
            
            <circle cx="28" cy="14" r="1.5"/>
            <circle cx="29" cy="17" r="1.5"/>
            <circle cx="28" cy="20" r="1.5"/>
            <circle cx="27" cy="23" r="1.5"/>
            
            <circle cx="22" cy="16" r="1"/>
            <circle cx="22" cy="19" r="1"/>
            <circle cx="22" cy="22" r="1"/>
            <circle cx="22" cy="25" r="1"/>
          </g>
          
          <circle cx="22" cy="22" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        </svg>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center', currentSize.spacing, className)}>
        <svg 
          className={cn(currentSize.icon)} 
          viewBox="0 0 44 44"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="iconGradientMinimal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor:"#10b981", stopOpacity:1}} />
              <stop offset="50%" style={{stopColor:"#059669", stopOpacity:1}} />
              <stop offset="100%" style={{stopColor:"#047857", stopOpacity:1}} />
            </linearGradient>
          </defs>
          
          <circle cx="22" cy="22" r="22" fill="url(#iconGradientMinimal)" />
          
          <g fill="white" opacity="0.95">
            <path d="M22 10 L22 34 M20 12 L24 12 M19 15 L25 15 M18 18 L26 18 M19 21 L25 21 M20 24 L24 24" 
                  stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            
            <circle cx="16" cy="14" r="1.5"/>
            <circle cx="15" cy="17" r="1.5"/>
            <circle cx="16" cy="20" r="1.5"/>
            <circle cx="17" cy="23" r="1.5"/>
            
            <circle cx="28" cy="14" r="1.5"/>
            <circle cx="29" cy="17" r="1.5"/>
            <circle cx="28" cy="20" r="1.5"/>
            <circle cx="27" cy="23" r="1.5"/>
          </g>
        </svg>
        <span className={cn('font-semibold text-foreground', currentSize.text)}>
          KisaanCenter
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', currentSize.spacing, className)}>
      <svg 
        className={cn(currentSize.icon)} 
        viewBox="0 0 44 44"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="iconGradientDefault" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor:"#10b981", stopOpacity:1}} />
            <stop offset="50%" style={{stopColor:"#059669", stopOpacity:1}} />
            <stop offset="100%" style={{stopColor:"#047857", stopOpacity:1}} />
          </linearGradient>
        </defs>
        
        <circle cx="22" cy="22" r="22" fill="url(#iconGradientDefault)" />
        
        <g fill="white" opacity="0.95">
          <path d="M22 10 L22 34 M20 12 L24 12 M19 15 L25 15 M18 18 L26 18 M19 21 L25 21 M20 24 L24 24 M21 27 L23 27" 
                stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          
          <circle cx="16" cy="14" r="1.5"/>
          <circle cx="15" cy="17" r="1.5"/>
          <circle cx="16" cy="20" r="1.5"/>
          <circle cx="17" cy="23" r="1.5"/>
          
          <circle cx="28" cy="14" r="1.5"/>
          <circle cx="29" cy="17" r="1.5"/>
          <circle cx="28" cy="20" r="1.5"/>
          <circle cx="27" cy="23" r="1.5"/>
          
          <circle cx="22" cy="16" r="1"/>
          <circle cx="22" cy="19" r="1"/>
          <circle cx="22" cy="22" r="1"/>
          <circle cx="22" cy="25" r="1"/>
        </g>
        
        <circle cx="22" cy="22" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
      </svg>
      <div className="flex flex-col">
        <span className={cn('font-bold text-foreground leading-tight', currentSize.text)}>
          KisaanCenter
        </span>
        <span className={cn('text-muted-foreground font-medium -mt-1', currentSize.subtext)}>
          Agricultural Hub
        </span>
      </div>
    </div>
  );
}