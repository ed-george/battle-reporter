/**
 * Application Configuration
 */

// External URL opened when a user clicks to tag a match (e.g. Google Form)
const configuredUrl = process.env.NEXT_PUBLIC_TAG_MATCH_URL || 'example.com';

// Ensure the URL is fully qualified with protocol for external navigation
export const TAG_MATCH_URL = configuredUrl.startsWith('http://') || configuredUrl.startsWith('https://')
  ? configuredUrl
  : `https://${configuredUrl}`;
