import { UAParser } from 'ua-parser-js';
import { AnalyticsEvent } from '@analytics/shared';

export type Enrichment = {
  browser?: string;
  browserVersion?: string;
  os?: string;
  device?: string;
  deviceType?: string;
  country?: string;
  city?: string;
};

export type EnrichedEvent = AnalyticsEvent & { enrichment: Enrichment };

function parseUserAgent(ua: string | undefined): EnrichedEvent['enrichment'] {
  if (!ua) return {};
  const parser = new UAParser(ua);
  const result = parser.getResult();
  return {
    browser: result.browser.name,
    browserVersion: result.browser.version,
    os: result.os.name,
    device: result.device.model,
    deviceType: result.device.type || 'desktop',
  };
}

// Note: In production, use MaxMind GeoLite2 DB for real geo-enrichment.
// Here we stub it with a mock for local dev.
function getGeoInfo(ip: string | undefined): Pick<EnrichedEvent['enrichment'], 'country' | 'city'> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return { country: 'Local', city: 'Localhost' };
  }
  // Stub — replace with maxmind lookup in production
  return { country: 'Unknown', city: 'Unknown' };
}

export function enrichEvent(event: AnalyticsEvent): EnrichedEvent {
  const meta = event.metadata as Record<string, string>;
  const uaEnrichment = parseUserAgent(meta.userAgent);
  const geoEnrichment = getGeoInfo(meta.ip);

  return {
    ...event,
    enrichment: {
      ...uaEnrichment,
      ...geoEnrichment,
    },
  };
}
