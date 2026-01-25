import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to generate signed URLs for private storage buckets
 * Falls back to original URL if it doesn't match the treatment-photos pattern
 */
export function useSignedUrl(url: string | null | undefined, expiresIn = 3600) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setSignedUrl(null);
      return;
    }

    // Check if this is a treatment-photos URL that needs signing
    const treatmentPhotosMatch = url.match(/treatment-photos\/(.+)$/);
    
    if (!treatmentPhotosMatch) {
      // Not a treatment-photos URL, use as-is
      setSignedUrl(url);
      return;
    }

    const filePath = treatmentPhotosMatch[1];
    
    const fetchSignedUrl = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error: signError } = await supabase.storage
          .from('treatment-photos')
          .createSignedUrl(filePath, expiresIn);
        
        if (signError) {
          throw signError;
        }
        
        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Error generating signed URL:', err);
        setError(err as Error);
        // Fall back to original URL on error
        setSignedUrl(url);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [url, expiresIn]);

  return { signedUrl, isLoading, error };
}

/**
 * Generate signed URLs for multiple photos at once
 */
export async function getSignedUrls(urls: (string | null)[]): Promise<(string | null)[]> {
  const results = await Promise.all(
    urls.map(async (url) => {
      if (!url) return null;
      
      const treatmentPhotosMatch = url.match(/treatment-photos\/(.+)$/);
      
      if (!treatmentPhotosMatch) {
        return url;
      }

      const filePath = treatmentPhotosMatch[1];
      
      try {
        const { data, error } = await supabase.storage
          .from('treatment-photos')
          .createSignedUrl(filePath, 3600);
        
        if (error) {
          console.error('Error generating signed URL:', error);
          return url;
        }
        
        return data.signedUrl;
      } catch (err) {
        console.error('Error generating signed URL:', err);
        return url;
      }
    })
  );

  return results;
}

/**
 * Extract file path from a storage URL for saving to database
 * Stores only the path, not the full URL
 */
export function extractFilePath(url: string): string {
  // If it's already just a path, return it
  if (!url.includes('://')) {
    return url;
  }
  
  // Extract path from full URL
  const match = url.match(/treatment-photos\/(.+?)(\?|$)/);
  return match ? match[1] : url;
}
