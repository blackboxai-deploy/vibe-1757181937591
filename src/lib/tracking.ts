import { LocationData } from './database';

export async function getLocationFromIP(ip: string): Promise<LocationData> {
  // Don't track localhost/private IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return {
      country: 'Local',
      city: 'Local',
      region: 'Local',
      latitude: null,
      longitude: null
    };
  }

  try {
    // Primary service: ipapi.co (free tier allows 1000 requests/day)
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        'User-Agent': 'TrackingApp/1.0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.reason || 'IP lookup failed');
      }

      return {
        country: data.country_name || null,
        city: data.city || null,
        region: data.region || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null
      };
    }
  } catch (error) {
    console.warn('Primary IP service failed:', error);
  }

  try {
    // Fallback service: ip-api.com (free tier)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.status === 'success') {
        return {
          country: data.country || null,
          city: data.city || null,
          region: data.regionName || null,
          latitude: data.lat || null,
          longitude: data.lon || null
        };
      }
    }
  } catch (error) {
    console.warn('Fallback IP service failed:', error);
  }

  // Return unknown location if all services fail
  return {
    country: 'Unknown',
    city: 'Unknown',
    region: 'Unknown',
    latitude: null,
    longitude: null
  };
}

export function getClientIP(request: Request): string | null {
  // Try various headers that might contain the real IP
  const headers = request.headers;
  
  const possibleHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'true-client-ip',   // Akamai
    'x-cluster-client-ip'
  ];

  for (const header of possibleHeaders) {
    const value = headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  // Fallback to remote address (may not be available in serverless)
  return null;
}

function isValidIP(ip: string): boolean {
  // Basic IP validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

export function parseUserAgent(userAgent: string | null) {
  if (!userAgent) return null;

  // Simple user agent parsing - you could use a library for more detailed parsing
  const browser = extractBrowser(userAgent);
  const os = extractOS(userAgent);
  const device = extractDevice(userAgent);

  return {
    raw: userAgent,
    browser,
    os,
    device,
    isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent),
    isBot: /bot|crawler|spider|crawling/i.test(userAgent)
  };
}

function extractBrowser(ua: string): string {
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/')) return 'Safari';
  if (ua.includes('Edge/')) return 'Edge';
  if (ua.includes('Opera/')) return 'Opera';
  return 'Unknown';
}

function extractOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS X')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return 'Unknown';
}

function extractDevice(ua: string): string {
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) return 'Android Device';
  if (ua.includes('Mobile')) return 'Mobile Device';
  return 'Desktop';
}

export function sanitizeReferer(referer: string | null): string | null {
  if (!referer) return null;
  
  try {
    const url = new URL(referer);
    // Remove sensitive query parameters
    url.search = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function generateTrackingUrl(shortCode: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  return `${base}/track/${shortCode}`;
}