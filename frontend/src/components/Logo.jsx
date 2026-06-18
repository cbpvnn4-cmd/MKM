import React from 'react';
import { Building2 } from 'lucide-react';

const Logo = ({ className = '', size = 'md', showText = true }) => {
  const [logoSrc, setLogoSrc] = React.useState('/images/logo.svg');
  const [hasLogo, setHasLogo] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);

  // Try to load the logo
  React.useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setHasLogo(true);
      setImageError(false);
    };
    img.onerror = () => {
      setHasLogo(false);
      setImageError(true);
    };
    img.src = logoSrc;
  }, [logoSrc]);

  const sizes = {
    xs: { icon: 'h-6 w-6', text: 'text-xs', container: 'h-10 w-10' },
    sm: { icon: 'h-12 w-12', text: 'text-sm', container: 'h-16 w-16' },
    md: { icon: 'h-16 w-16', text: 'text-base', container: 'h-20 w-20' },
    lg: { icon: 'h-20 w-20', text: 'text-xl', container: 'h-24 w-24' },
    xl: { icon: 'h-24 w-24', text: 'text-2xl', container: 'h-28 w-28' },
    '2xl': { icon: 'h-32 w-32', text: 'text-3xl', container: 'h-36 w-36' },
    '3xl': { icon: 'h-40 w-40', text: 'text-4xl', container: 'h-44 w-44' },
    '4xl': { icon: 'h-48 w-48', text: 'text-5xl', container: 'h-52 w-52' },
    '5xl': { icon: 'h-56 w-56', text: 'text-6xl', container: 'h-60 w-60' },
    '6xl': { icon: 'h-64 w-64', text: 'text-7xl', container: 'h-72 w-72' },
    // أحجام أفقية (عريضة)
    'wide-sm': { icon: 'h-12 w-20', text: 'text-sm', container: 'h-16 w-32' },
    'wide-md': { icon: 'h-16 w-32', text: 'text-base', container: 'h-20 w-48' },
    'wide-lg': { icon: 'h-20 w-40', text: 'text-xl', container: 'h-24 w-56' },
    'wide-xl': { icon: 'h-24 w-48', text: 'text-2xl', container: 'h-28 w-64' },
    'wide-2xl': { icon: 'h-32 w-64', text: 'text-3xl', container: 'h-36 w-80' },
    'wide-3xl': { icon: 'h-40 w-80', text: 'text-4xl', container: 'h-44 w-96' },
    'wide-4xl': { icon: 'h-48 w-96', text: 'text-5xl', container: 'h-52 w-full max-w-md' },
    'wide-5xl': { icon: 'h-56 w-full', text: 'text-6xl', container: 'h-60 w-full max-w-lg' },
    'wide-6xl': { icon: 'h-64 w-full', text: 'text-7xl', container: 'h-72 w-full max-w-xl' },
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {hasLogo && !imageError ? (
        <img
          src={logoSrc}
          alt="نظام إدارة المصاعد"
          className={`${currentSize.container} object-contain`}
          onError={() => {
            setHasLogo(false);
            setImageError(true);
          }}
        />
      ) : (
        <div className={`${currentSize.container} rounded-lg bg-primary flex items-center justify-center`}>
          <Building2 className={`${currentSize.icon} text-primary-foreground`} />
        </div>
      )}
      {showText && (
        <span className={`font-bold ${currentSize.text}`}>
          نظام إدارة المصاعد
        </span>
      )}
    </div>
  );
};

export default Logo;
