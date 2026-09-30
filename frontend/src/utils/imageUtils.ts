/**
 * Image URL utilities
 */

/**
 * Resolves relative image paths to full URLs
 * Handles both absolute URLs and relative paths from the backend
 */
export const getImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('http')) return url;

  // Clean Image Path (Handle Windows backslashes)
  let imagePath = url.replace(/\\/g, '/');
  
  // Ensure leading slash
  if (!imagePath.startsWith('/')) {
    imagePath = `/${imagePath}`;
  }

  // Return relative path - let frontend's nginx proxy handle it
  return imagePath;
};