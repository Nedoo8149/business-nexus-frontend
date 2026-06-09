import React from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string | null; // Isay optional kar diya taake crash na ho
  alt?: string;
  size?: AvatarSize;
  className?: string;
  status?: 'online' | 'offline' | 'away' | 'busy' | null;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'User',
  size = 'md',
  className = '',
  status,
}) => {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };
  
  const statusColors = {
    online: 'bg-success-500', // Make sure aapke tailwind config mein success-500 ho, ya 'bg-green-500' likh dein
    offline: 'bg-gray-400',
    away: 'bg-warning-500',
    busy: 'bg-error-500',
  };
  
  const statusSizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4',
  };

  // 🔥 ENTERPRISE FIX: Environment variable se Base URL uthana
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  let finalSrc = src;

  // Agar path DB se /uploads ki shakal mein aa raha hai, tou aagay backend ka link lagao
  if (finalSrc && finalSrc.startsWith('/')) {
    finalSrc = `${BACKEND_URL}${finalSrc}`;
  }

  // Agar DB mein link nahi hai (empty string ya null), toh initial fallback lagao
  if (!finalSrc || finalSrc.trim() === '') {
    finalSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(alt)}&background=random`;
  }
  
  return (
    <div className={`relative inline-block ${className}`}>
      <img
        src={finalSrc}
        alt={alt}
        className={`rounded-full object-cover bg-gray-100 ${sizeClasses[size]}`}
        onError={(e) => {
          // Fallback to initials if original image fails to load
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(alt)}&background=random`;
        }}
      />
      
      {status && (
        <span 
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white ${statusColors[status]} ${statusSizes[size]}`}
        />
      )}
    </div>
  );
};