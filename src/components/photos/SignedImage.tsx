import React from 'react';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Skeleton } from '@/components/ui/skeleton';
import { Image } from 'lucide-react';

interface SignedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Image component that handles signed URLs for private storage buckets
 * Automatically generates signed URLs for treatment-photos bucket
 */
export function SignedImage({ src, alt, className, fallback }: SignedImageProps) {
  const { signedUrl, isLoading, error } = useSignedUrl(src);

  if (!src) {
    return (
      fallback || (
        <div className={`flex items-center justify-center bg-muted ${className}`}>
          <Image className="h-8 w-8 text-muted-foreground" />
        </div>
      )
    );
  }

  if (isLoading) {
    return <Skeleton className={className} />;
  }

  if (error || !signedUrl) {
    return (
      fallback || (
        <div className={`flex items-center justify-center bg-muted ${className}`}>
          <Image className="h-8 w-8 text-muted-foreground" />
        </div>
      )
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
    />
  );
}
