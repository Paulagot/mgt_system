// client/src/services/prizeFinderService.ts
// Prize Finder: OSM (Nominatim + Overpass) search + email template + CRM mapping helpers

export type PrizeFinderCategoryId =
  | ''
  | 'health_spa'
  | 'butcher'
  | 'bakery'
  | 'bar_pub_cafe'
  | 'attraction'
  | 'beauty_salon'
  | 'gift_shop'
  | 'restaurant';

export type EmailTemplateKey = 'casual' | 'formal' | 'community' | 'sales' | 'personalised';

export type BusinessResult = {
  name: string;
  category: string;
  address: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  distanceKm: number;
};

export const categoryMapping: Record<Exclude<PrizeFinderCategoryId, ''>, string[]> = {
  health_spa: ['leisure=sports_centre', 'leisure=fitness_centre', 'amenity=gym', 'amenity=spa'],
  butcher: ['shop=butcher'],
  bakery: ['shop=bakery'],
  bar_pub_cafe: ['amenity=pub', 'amenity=bar', 'amenity=cafe'],
  attraction: ['tourism=attraction', 'tourism=museum', 'tourism=gallery'],
  beauty_salon: ['shop=beauty', 'amenity=salon'],
  gift_shop: ['shop=gift'],
  restaurant: ['amenity=restaurant'],
};

export const emailTemplates: Record<EmailTemplateKey, { subject: string; body: string }> = {
  casual: {
    subject: 'Quiz Night Prize Sponsorship - {businessName}',
    body: `Hi {businessName},

We're running a quiz night to raise funds for {orgName} and we'd love your support!

Would you be interested in donating a prize? We'll give you a shout-out as a sponsor.

Let us know if you're interested!

Cheers,
{orgName}`,
  },
  formal: {
    subject: 'Sponsorship Opportunity - Quiz Night Prize Donation',
    body: `Dear {businessName},

We are writing to you on behalf of {orgName} to request your support for our upcoming quiz night fundraising event{eventDate}.

We are seeking local businesses to contribute prizes for our event. In return, your business will be recognised as a sponsor and receive prominent acknowledgement during the event and in our promotional materials.

This is an excellent opportunity to demonstrate your commitment to supporting the local community whilst gaining valuable exposure to local families and residents.

We would be delighted to discuss this opportunity with you further.

Kind regards,
{orgName}`,
  },
  community: {
    subject: 'Support Your Local Community - Quiz Night Sponsorship',
    body: `Hello {businessName},

{orgName} is hosting a quiz night to support our community, and we're reaching out to local businesses like yours to help make it special.

We're looking for businesses willing to donate a prize. In return, we'll recognise you as a sponsor and celebrate your support for the local community.

Supporting local fundraising is a wonderful way to show you care about the area you serve.

Would you be interested in helping?

Best wishes,
{orgName}`,
  },
  sales: {
    subject: 'Increase Your Brand Visibility - Quiz Night Prize Sponsorship',
    body: `Dear {businessName},

Imagine reaching hundreds of local families and residents in one evening. That's exactly what sponsoring our quiz night offers.

{orgName} is hosting a quiz night{eventDate}, and we're partnering with local businesses to make it memorable. By donating a prize, your business will:

• Be recognised as a sponsor throughout the event
• Receive prominent mention in our promotional materials
• Build goodwill with the local community
• Gain exposure to families and residents in your area

This is a cost-effective marketing opportunity that demonstrates your commitment to the community.

Are you interested in learning more?

Best regards,
{orgName}`,
  },
  personalised: {
    subject: 'Quiz Night Prize Sponsorship - {businessName}',
    body: `Dear {businessName},

We're reaching out because we believe your business is a perfect fit for supporting {orgName}'s upcoming quiz night{eventDate}.

{businessName} is exactly the kind of forward-thinking local business that our community values. We'd love for you to be part of our event by donating a prize.

In return, we'll ensure {businessName} receives full recognition as a sponsor, giving you valuable visibility with local families and residents.

Would {businessName} be interested in this opportunity?

Warm regards,
{orgName}`,
  },
};

export function businessKey(name: string) {
  return name.toLowerCase().trim();
}

export function validateUkPostcode(postcode: string) {
  const postcodeRegex = /^[A-Z]{1,2}[0-9]{1,2}\s?[0-9][A-Z]{2}$/i;
  return postcodeRegex.test(postcode.trim());
}

export function formatCategory(catId: Exclude<PrizeFinderCategoryId, ''>) {
  const names: Record<string, string> = {
    health_spa: 'Health Club / Spa',
    butcher: 'Butcher',
    bakery: 'Bakery',
    bar_pub_cafe: 'Bar/Pub/Café',
    attraction: 'Attraction',
    beauty_salon: 'Beauty Salon',
    gift_shop: 'Gift Shop',
    restaurant: 'Restaurant',
  };
  return names[catId] || 'Business';
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getCoordinatesFromPostcode(postcode: string, opts?: { signal?: AbortSignal }) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    postcode
  )}&countrycodes=gb&limit=1`;

  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) throw new Error('Failed to find postcode. Please try again.');
  const data = (await res.json()) as Array<any>;
  if (!data?.length) throw new Error('Postcode not found. Please check and try again.');

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name as string,
  };
}

export async function searchBusinesses(params: {
  centerLat: number;
  centerLon: number;
  radiusMiles: number;
  category: PrizeFinderCategoryId;
  signal?: AbortSignal;
}): Promise<BusinessResult[]> {
  const { centerLat, centerLon, radiusMiles, category, signal } = params;
  const radiusMeters = radiusMiles * 1609.34;

  let query = `[out:json];(`;

  if (category && categoryMapping[category]) {
    for (const tag of categoryMapping[category]) {
      const [key, value] = tag.split('=');
      query += `node["${key}"="${value}"](around:${radiusMeters},${centerLat},${centerLon});`;
      query += `way["${key}"="${value}"](around:${radiusMeters},${centerLat},${centerLon});`;
    }
  } else {
    const amenities = ['shop', 'amenity', 'leisure', 'tourism'];
    for (const key of amenities) {
      query += `node["${key}"](around:${radiusMeters},${centerLat},${centerLon});`;
      query += `way["${key}"](around:${radiusMeters},${centerLat},${centerLon});`;
    }
  }

  query += `);out center;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'text/plain' },
    signal,
  });

  if (!res.ok) {
    throw new Error('Failed to search for businesses. The service may be temporarily busy. Please try again.');
  }

  const data = (await res.json()) as { elements?: any[] };
  const elements = Array.isArray(data.elements) ? data.elements : [];

  const results: BusinessResult[] = [];
  const radiusKm = radiusMiles * 1.60934;

  for (const el of elements) {
    if (!el?.tags?.name) continue;

    let lat: number | null = null;
    let lon: number | null = null;

    if (typeof el.lat === 'number' && typeof el.lon === 'number') {
      lat = el.lat;
      lon = el.lon;
    } else if (el.center?.lat && el.center?.lon) {
      lat = el.center.lat;
      lon = el.center.lon;
    }
    if (lat == null || lon == null) continue;

    const distanceKm = haversineKm(centerLat, centerLon, lat, lon);
    if (distanceKm > radiusKm) continue;

    // infer category label
    let categoryLabel = 'Business';
    for (const [cat, tags] of Object.entries(categoryMapping)) {
      for (const t of tags) {
        const [k, v] = t.split('=');
        if (el.tags?.[k] === v) {
          categoryLabel = formatCategory(cat as Exclude<PrizeFinderCategoryId, ''>);
          break;
        }
      }
    }

    const tags = el.tags ?? {};
    let address = 'Address not available';
    if (tags['addr:full']) address = tags['addr:full'];
    else if (tags['addr:street'] && tags['addr:city']) address = `${tags['addr:street']}, ${tags['addr:city']}`;
    else if (tags['addr:street']) address = tags['addr:street'];

    results.push({
      name: String(tags.name),
      category: categoryLabel,
      address,
      website: tags.website || tags.contact_website || null,
      email: tags.email || tags.contact_email || null,
      phone: tags.phone || tags.contact_phone || null,
      distanceKm: Number(distanceKm.toFixed(1)),
    });
  }

  // de-dupe by name
  const seen = new Set<string>();
  const unique = results.filter((b) => {
    const key = businessKey(b.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 100);
}

export function buildEmail(params: {
  templateKey: EmailTemplateKey;
  businessName: string;
  orgName: string;
  eventDateIso?: string;
}) {
  const { templateKey, businessName, orgName, eventDateIso } = params;
  const tpl = emailTemplates[templateKey];

  const prettyDate =
    eventDateIso && eventDateIso.trim().length > 0
      ? ` on ${new Date(eventDateIso).toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`
      : '';

  let body = tpl.body;

  const replacements: Record<string, string> = {
    '{businessName}': businessName,
    '{orgName}': orgName,
    '{eventDate}': prettyDate,
  };

  for (const [k, v] of Object.entries(replacements)) {
    body = body.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), v);
  }

  const subject = tpl.subject.replace('{businessName}', businessName);
  return { subject, body };
}

export function buildMailtoLink(params: { toEmail?: string | null; subject: string; body: string }) {
  const to = params.toEmail ? params.toEmail : '';
  const q = new URLSearchParams({
    subject: params.subject,
    body: params.body,
  });

  // Some clients are picky: keep it simple + encoded
  return `mailto:${encodeURIComponent(to)}?${q.toString()}`;
}

export function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  // return YYYY-MM-DD (matches your DB "date" fields)
  return d.toISOString().slice(0, 10);
}

/**
 * Creates a CreateSupporterData payload for sponsor lead.
 * NOTE: You are choosing to treat Supporter.name as BUSINESS NAME for sponsor leads.
 * Later you’ll add contact_name/contact_role and backfill from notes.
 */
export function mapBusinessToCreateSupporter(params: {
  business: BusinessResult;
  emailDraft?: { subject: string; body: string };
  tags?: string[];
}) {
  const { business: b, emailDraft, tags } = params;

  const notesLines = [
    'Saved from Prize Finder (OpenStreetMap/Overpass)',
    `Category: ${b.category}`,
    `Distance: ${b.distanceKm} km`,
    b.website ? `Website: ${b.website}` : null,
    b.address ? `Address: ${b.address}` : null,
    b.email ? `Email: ${b.email}` : null,
    b.phone ? `Phone: ${b.phone}` : null,
    emailDraft ? '' : null,
    emailDraft ? '--- Draft outreach email ---' : null,
    emailDraft ? `Subject: ${emailDraft.subject}` : null,
    emailDraft ? emailDraft.body : null,
  ].filter(Boolean);

  return {
    name: b.name,
    type: 'sponsor' as const,
    notes: notesLines.join('\n'),
    email: b.email ?? undefined,
    phone: b.phone ?? undefined,
    address_line1: b.address && b.address !== 'Address not available' ? b.address : undefined,
    preferred_contact_method: b.email ? ('email' as const) : b.phone ? ('phone' as const) : undefined,
    relationship_strength: 'prospect' as const,
    lifecycle_stage: 'prospect' as const,
    contact_source: 'cold_outreach' as const,
    tags: tags ?? ['prize-finder', 'sponsor-lead'],
    gdpr_consent: false,
  };
}
