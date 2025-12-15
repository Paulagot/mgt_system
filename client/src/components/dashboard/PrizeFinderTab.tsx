// client/src/components/dashboard/PrizeFinderTab.tsx
import React, { useMemo, useRef, useState } from 'react';

import supporterService from '../../services/supporterService';
import communicationService, { type CreateCommunicationData } from '../../services/communicationService';

import {
  type BusinessResult,
  type EmailTemplateKey,
  type PrizeFinderCategoryId,
  addDaysISO,
  buildEmail,
  buildMailtoLink,
  businessKey,
  getCoordinatesFromPostcode,
  mapBusinessToCreateSupporter,
  searchBusinesses,
  validateUkPostcode,
} from '../../services/prizeFinderService';

interface PrizeFinderTabProps {
  clubId: string;
  clubName: string;
  onSupporterCreated?: () => void; // optional callback to refresh supporters list
}

export default function PrizeFinderTab({ clubId, clubName, onSupporterCreated }: PrizeFinderTabProps) {
  const [postcode, setPostcode] = useState('');
  const [radiusMiles, setRadiusMiles] = useState<number>(3);
  const [category, setCategory] = useState<PrizeFinderCategoryId>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [results, setResults] = useState<BusinessResult[]>([]);

  // key -> supporterId saved in CRM
  const [supporterIdByBusiness, setSupporterIdByBusiness] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Email modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessResult | null>(null);
  const [template, setTemplate] = useState<EmailTemplateKey>('community');
  const [orgName, setOrgName] = useState<string>(clubName || '');
  const [eventDate, setEventDate] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState('');
  const [followUpDays, setFollowUpDays] = useState<number>(7);

  const abortRef = useRef<AbortController | null>(null);

  const generated = useMemo(() => {
    if (!selectedBusiness || !orgName.trim()) {
      return { subject: '', body: 'Please enter your organisation name to generate an email.' };
    }
    return buildEmail({
      templateKey: template,
      businessName: selectedBusiness.name,
      orgName: orgName.trim(),
      eventDateIso: eventDate,
    });
  }, [selectedBusiness, orgName, template, eventDate]);

  function openEmail(b: BusinessResult) {
    setSelectedBusiness(b);
    setTemplate('community');
    setEventDate('');
    setIsEditing(false);
    setEditedBody('');
    setFollowUpDays(7);
    setModalOpen(true);
  }

  function closeEmail() {
    setModalOpen(false);
    setSelectedBusiness(null);
    setIsEditing(false);
    setEditedBody('');
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  async function handleSearch() {
    setError(null);

    const pc = postcode.trim();
    if (!pc) return setError('Please enter a postcode.');
    if (!validateUkPostcode(pc)) return setError('Please enter a valid UK postcode (e.g., M1 1AE).');
    if (!radiusMiles || radiusMiles < 0.5 || radiusMiles > 15) return setError('Radius must be between 0.5 and 15 miles.');

    // cancel previous
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const coords = await getCoordinatesFromPostcode(pc, { signal: abortRef.current.signal });
      const businesses = await searchBusinesses({
        centerLat: coords.lat,
        centerLon: coords.lon,
        radiusMiles,
        category,
        signal: abortRef.current.signal,
      });

      setLocationLabel(coords.displayName);
      setResults(businesses);

      if (!businesses.length) {
        setError('No businesses found in this area. Try increasing the radius or changing the category.');
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Something went wrong searching businesses.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Ensures a supporter exists for this business (creates if missing),
   * returns supporterId.
   */
  async function ensureSupporterForBusiness(b: BusinessResult, draft?: { subject: string; body: string }) {
    const key = businessKey(b.name);

    const existingId = supporterIdByBusiness[key];
    if (existingId) return existingId;

    setSavingKey(key);
    setError(null);

    try {
      const payload = mapBusinessToCreateSupporter({
        business: b,
        emailDraft: draft,
        tags: ['prize-finder', 'sponsor-lead'],
      });

      // You return { supporter } from backend. We'll read supporter.id.
      const resp = await supporterService.createSupporter(clubId, payload);

      const supporter = (resp as any)?.supporter;
      const supporterId = supporter?.id as string | undefined;

      if (!supporterId) {
        throw new Error('Supporter created but no supporter ID returned from API.');
      }

      setSupporterIdByBusiness((prev) => ({ ...prev, [key]: supporterId }));
      onSupporterCreated?.();

      return supporterId;
    } finally {
      setSavingKey(null);
    }
  }

  async function saveToCrmOnly(b: BusinessResult) {
    const key = businessKey(b.name);
    if (supporterIdByBusiness[key]) return;

    try {
      await ensureSupporterForBusiness(b);
    } catch (e: any) {
      setError(e?.message || 'Failed to save supporter to CRM.');
    }
  }

  /**
   * Main flow:
   * - ensure saved to CRM
   * - open mailto with subject+body
   * - log communication with follow-up date
   */
  async function sendEmailAndLogFollowUp(b: BusinessResult) {
    try {
      setError(null);

      const bodyToUse = isEditing ? editedBody : generated.body;
      const draft = { subject: generated.subject, body: bodyToUse };

      const supporterId = await ensureSupporterForBusiness(b, draft);

      // 1) Open email app
      const mailto = buildMailtoLink({
        toEmail: b.email,
        subject: draft.subject,
        body: draft.body,
      });
      window.location.href = mailto;

      // 2) Log communication in CRM
      const followUpDate = addDaysISO(Math.max(0, Number(followUpDays) || 0));

      const comm: CreateCommunicationData = {
        type: 'email',
        direction: 'outbound',
        subject: draft.subject,
        notes: draft.body,
        outcome: 'no_response',
        follow_up_required: true,
        follow_up_date: followUpDate,
        follow_up_notes: `Prize Finder outreach email sent. Follow up in ${followUpDays} day(s).`,
        communication_channel: 'email',
        tags: ['prize-finder', 'outreach', 'sponsor'],
      };

      await communicationService.logCommunication(supporterId, comm);
    } catch (e: any) {
      setError(e?.message || 'Failed to open email / log follow-up.');
    }
  }

  React.useEffect(() => {
  console.log('[PrizeFinderTab] MOUNT');
  return () => console.log('[PrizeFinderTab] UNMOUNT');
}, []);


  return (
    <div className="space-y-6">
      {/* Header / Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Prize Finder</h2>
            <p className="text-sm text-gray-600 mt-1">
              Search local businesses near a UK postcode, save sponsor leads to your CRM, and send outreach emails with follow-ups.
            </p>
          </div>
          <div className="text-xs text-gray-500">Source: OpenStreetMap (Nominatim + Overpass)</div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-700">UK Postcode</label>
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="e.g., M1 1AE"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-700">Radius (miles)</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="range"
                min={0.5}
                max={15}
                step={0.5}
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(parseFloat(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                min={0.5}
                max={15}
                step={0.5}
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(parseFloat(e.target.value))}
                className="w-24 rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PrizeFinderCategoryId)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
            >
              <option value="">All businesses</option>
              <option value="restaurant">Restaurant</option>
              <option value="bar_pub_cafe">Bar / Pub / Café</option>
              <option value="bakery">Bakery</option>
              <option value="butcher">Butcher</option>
              <option value="gift_shop">Gift shop</option>
              <option value="beauty_salon">Beauty salon</option>
              <option value="health_spa">Health club / Spa</option>
              <option value="attraction">Attraction</option>
            </select>
          </div>

          <div className="md:col-span-1 flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Results</h3>
            <p className="text-sm text-gray-600 mt-1">
              {locationLabel ? (
                <>
                  Found <strong>{results.length}</strong> businesses near{' '}
                  <span className="font-medium">{locationLabel}</span>
                </>
              ) : (
                'Run a search to see local businesses.'
              )}
            </p>
          </div>

          {!!results.length && <div className="text-xs text-gray-500">Showing top {Math.min(results.length, 100)} by distance</div>}
        </div>

        {!results.length ? (
          <div className="mt-6 text-sm text-gray-600">No results yet.</div>
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {results.map((b) => {
              const key = businessKey(b.name);
              const supporterId = supporterIdByBusiness[key];
              const saving = savingKey === key;

              return (
                <div key={key} className="rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold text-gray-900">{b.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {b.category}
                        </span>
                        <span className="text-xs text-gray-500">{b.distanceKm} km away</span>
                        {supporterId && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Saved to CRM
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-gray-700">
                        <div className="flex gap-2">
                          <span className="text-gray-400">📍</span>
                          <span className="line-clamp-2">{b.address}</span>
                        </div>

                        {b.website && (
                          <div className="flex gap-2">
                            <span className="text-gray-400">🌐</span>
                            <a className="text-blue-600 hover:underline break-all" href={b.website} target="_blank" rel="noreferrer">
                              {b.website}
                            </a>
                          </div>
                        )}

                        {b.email && (
                          <div className="flex gap-2">
                            <span className="text-gray-400">✉️</span>
                            <span className="break-all">{b.email}</span>
                          </div>
                        )}

                        {b.phone && (
                          <div className="flex gap-2">
                            <span className="text-gray-400">📞</span>
                            <span className="break-all">{b.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[160px]">
                      <button
                        onClick={() => openEmail(b)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                      >
                        Generate Email
                      </button>

                      <button
                        onClick={() => saveToCrmOnly(b)}
                        disabled={!!supporterId || saving}
                        className={[
                          'rounded-lg px-3 py-2 text-sm font-medium',
                          supporterId
                            ? 'bg-green-100 text-green-800 border border-green-200 cursor-default'
                            : 'bg-green-600 text-white hover:bg-green-700',
                          saving ? 'opacity-70' : '',
                        ].join(' ')}
                      >
                        {supporterId ? 'Saved ✓' : saving ? 'Saving…' : 'Save to CRM'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Modal */}
      {modalOpen && selectedBusiness && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEmail();
          }}
        >
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-start justify-between p-5 border-b border-gray-200">
              <div>
                <div className="text-lg font-semibold text-gray-900">Outreach Email</div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">{selectedBusiness.name}</span> • {selectedBusiness.address}
                </div>
              </div>
              <button onClick={closeEmail} className="rounded-lg px-3 py-1.5 text-sm border border-gray-300 hover:bg-gray-50">
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                  <label className="block text-sm font-medium text-gray-700">Organisation name</label>
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="e.g., St. Mark’s GAA"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700">Event date (optional)</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Template</label>
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value as EmailTemplateKey)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  >
                    <option value="community">Community</option>
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                    <option value="sales">Sales</option>
                    <option value="personalised">Personalised</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700">Follow-up in (days)</label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={followUpDays}
                    onChange={(e) => setFollowUpDays(Math.max(0, parseInt(e.target.value || '0', 10)))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Will be logged as a CRM follow-up task.
                  </div>
                </div>

                <div className="md:col-span-8">
                  <div className="text-sm font-medium text-gray-700">Subject</div>
                  <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                    {generated.subject || '—'}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-gray-700">Email body</div>
                  <button
                    onClick={() => {
                      if (!isEditing) setEditedBody(generated.body);
                      setIsEditing((v) => !v);
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    {isEditing ? 'Cancel Edit' : 'Edit'}
                  </button>
                </div>

                {!isEditing ? (
                  <textarea
                    readOnly
                    value={generated.body}
                    className="mt-2 w-full min-h-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                ) : (
                  <textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="mt-2 w-full min-h-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(isEditing ? editedBody : generated.body)}
                    className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
                  >
                    Copy Email
                  </button>

                  <button
                    onClick={() => saveToCrmOnly(selectedBusiness)}
                    disabled={!!supporterIdByBusiness[businessKey(selectedBusiness.name)] || savingKey === businessKey(selectedBusiness.name)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                  >
                    {supporterIdByBusiness[businessKey(selectedBusiness.name)] ? 'Saved ✓' : 'Save to CRM'}
                  </button>
                </div>

                <button
                  onClick={() => sendEmailAndLogFollowUp(selectedBusiness)}
                  disabled={!orgName.trim()}
                  className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                  title={!orgName.trim() ? 'Enter organisation name to generate the email' : ''}
                >
                  Open Email App + Log Follow-up
                </button>
              </div>

              <div className="text-xs text-gray-500">
                This will: <strong>(1)</strong> ensure the sponsor lead is saved to CRM, <strong>(2)</strong> open your email client with subject/body prefilled, and{' '}
                <strong>(3)</strong> log an outbound email communication with a follow-up due date.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

