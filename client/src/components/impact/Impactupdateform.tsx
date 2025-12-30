// client/src/components/impact/ImpactUpdateForm.tsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, MapPin, DollarSign, Image, FileText } from 'lucide-react';
import ImpactService, { 
  ImpactUpdate, 
  CreateImpactData, 
  ImpactMetric, 
  ImpactMedia,
  ImpactLocation 
} from '../../services/impactService';
import { IMPACT_AREAS, type ImpactAreaId } from '../../types/impactAreas';

interface ImpactUpdateFormProps {
  eventId?: string;
  campaignId?: string;
  existingImpact?: ImpactUpdate;
  onClose: () => void;
  onSuccess: () => void;
  events?: Array<{ id: string; title: string; campaign_id?: string; impact_area_ids?: string[] }>;
  campaigns?: Array<{ id: string; name: string; impact_area_ids?: string[] }>;
}

const ImpactUpdateForm: React.FC<ImpactUpdateFormProps> = ({
  eventId: propEventId,
  campaignId: propCampaignId,
  existingImpact,
  onClose,
  onSuccess,
  events = [],
  campaigns = [],
}) => {
  const isEdit = !!existingImpact;

  // Form state
  const [selectedEventId, setSelectedEventId] = useState(propEventId || existingImpact?.event_id || '');
  const [selectedCampaignId, setSelectedCampaignId] = useState(propCampaignId || existingImpact?.campaign_id || '');
  const [title, setTitle] = useState(existingImpact?.title || '');
  const [description, setDescription] = useState(existingImpact?.description || '');
  const [impactDate, setImpactDate] = useState(
    existingImpact?.impact_date 
      ? new Date(existingImpact.impact_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [impactAreaIds, setImpactAreaIds] = useState<ImpactAreaId[]>(
    existingImpact?.impact_area_ids || []
  );
  const [metrics, setMetrics] = useState<ImpactMetric[]>(
    existingImpact?.metrics || [ImpactService.createEmptyMetric()]
  );
  const [amountSpent, setAmountSpent] = useState<string>(
    existingImpact?.amount_spent?.toString() || ''
  );
  const [currency, setCurrency] = useState(existingImpact?.currency || 'EUR');
  
  // Location state
  const [location, setLocation] = useState<ImpactLocation | null>(existingImpact?.location || null);
  const [showLocationForm, setShowLocationForm] = useState(!!existingImpact?.location);

  // Proof state
  const [receipts, setReceipts] = useState<string[]>(existingImpact?.proof.receipts || []);
  const [invoices, setInvoices] = useState<string[]>(existingImpact?.proof.invoices || []);
  const [media, setMedia] = useState<ImpactMedia[]>(
    existingImpact?.proof.media || [ImpactService.createEmptyMedia()]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Auto-populate impact areas when event/campaign is selected
  useEffect(() => {
    if (isEdit) return; // Don't auto-populate when editing

    let areasToPopulate: ImpactAreaId[] = [];

    // First check if selected event has impact areas
    if (selectedEventId) {
      const selectedEvent = events.find(e => e.id === selectedEventId);
      if (selectedEvent && 'impact_area_ids' in selectedEvent && Array.isArray((selectedEvent as any).impact_area_ids)) {
        areasToPopulate = (selectedEvent as any).impact_area_ids;
      }
    }

    // If no event areas, check campaign
    if (areasToPopulate.length === 0 && selectedCampaignId) {
      const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
      if (selectedCampaign && 'impact_area_ids' in selectedCampaign && Array.isArray((selectedCampaign as any).impact_area_ids)) {
        areasToPopulate = (selectedCampaign as any).impact_area_ids;
      }
    }

    if (areasToPopulate.length > 0 && impactAreaIds.length === 0) {
      setImpactAreaIds(areasToPopulate.slice(0, 3)); // Max 3
    }
  }, [selectedEventId, selectedCampaignId, events, campaigns, isEdit]);

  // Add metric
  const handleAddMetric = () => {
    setMetrics([...metrics, ImpactService.createEmptyMetric()]);
  };

  // Remove metric
  const handleRemoveMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  // Update metric
  const handleUpdateMetric = (index: number, field: keyof ImpactMetric, value: any) => {
    const updated = [...metrics];
    updated[index] = { ...updated[index], [field]: value };
    setMetrics(updated);
  };

  // Add media
  const handleAddMedia = () => {
    setMedia([...media, ImpactService.createEmptyMedia()]);
  };

  // Remove media
  const handleRemoveMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  // Update media
  const handleUpdateMedia = (index: number, field: keyof ImpactMedia, value: any) => {
    const updated = [...media];
    updated[index] = { ...updated[index], [field]: value };
    setMedia(updated);
  };

  // Add receipt URL
  const handleAddReceipt = () => {
    setReceipts([...receipts, '']);
  };

  // Update receipt URL
  const handleUpdateReceipt = (index: number, value: string) => {
    const updated = [...receipts];
    updated[index] = value;
    setReceipts(updated);
  };

  // Remove receipt
  const handleRemoveReceipt = (index: number) => {
    setReceipts(receipts.filter((_, i) => i !== index));
  };

  // Toggle impact area
  const handleToggleImpactArea = (areaId: ImpactAreaId) => {
    if (impactAreaIds.includes(areaId)) {
      setImpactAreaIds(impactAreaIds.filter(id => id !== areaId));
    } else {
      if (impactAreaIds.length < 3) {
        setImpactAreaIds([...impactAreaIds, areaId]);
      }
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);

    // Validate either event or campaign is selected
    if (!selectedEventId && !selectedCampaignId) {
      setValidationErrors(['Please select either an event or a campaign']);
      return;
    }

    const impactData: CreateImpactData = {
      event_id: selectedEventId || undefined,
      campaign_id: selectedCampaignId || undefined,
      impact_area_ids: impactAreaIds,
      title: title.trim(),
      description: description.trim(),
      impact_date: impactDate,
      metrics: metrics.filter(m => m.milestone && m.value > 0),
      amount_spent: amountSpent ? parseFloat(amountSpent) : undefined,
      currency,
      location: location || undefined,
      proof: {
        receipts: receipts.filter(Boolean),
        invoices: invoices.filter(Boolean),
        quotes: [], // Testimonials added later via admin approval
        media: media.filter(m => m.url),
      },
    };

    // Validate
    const validation = ImpactService.validateImpactData(impactData);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    setLoading(true);

    try {
      if (isEdit) {
        await ImpactService.updateImpact(existingImpact.id, impactData);
      } else {
        await ImpactService.createImpact(impactData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save impact update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Impact Update' : 'Create Impact Update'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
              <p className="font-semibold mb-2">Please fix the following:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Event and Campaign Selection */}
          {!isEdit && (
            <div className="space-y-4 pb-4 border-b">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    // Auto-select campaign if event has one
                    const selectedEvent = events.find(ev => ev.id === e.target.value);
                    if (selectedEvent?.campaign_id) {
                      setSelectedCampaignId(selectedEvent.campaign_id);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!!propEventId}
                >
                  <option value="">Select an event (optional)</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </div>

              {campaigns.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign
                  </label>
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={!!propCampaignId}
                  >
                    <option value="">Select a campaign (optional)</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Medical Supplies Delivered to Hospital"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Tell the story of the impact..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Impact Date *
              </label>
              <input
                type="date"
                value={impactDate}
                onChange={(e) => setImpactDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Impact Areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Impact Areas * (Select up to 3)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {IMPACT_AREAS.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => handleToggleImpactArea(area.id)}
                  disabled={!impactAreaIds.includes(area.id) && impactAreaIds.length >= 3}
                  className={`p-3 text-left rounded-lg border-2 transition-colors ${
                    impactAreaIds.includes(area.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${!impactAreaIds.includes(area.id) && impactAreaIds.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-medium text-sm">{area.label}</div>
                  <div className="text-xs text-gray-500">{area.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Impact Metrics * (What was achieved?)
              </label>
              <button
                type="button"
                onClick={handleAddMetric}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                <Plus size={16} className="mr-1" /> Add Metric
              </button>
            </div>
            <div className="space-y-3">
              {metrics.map((metric, index) => (
                <div key={metric.id} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={metric.milestone}
                      onChange={(e) => handleUpdateMetric(index, 'milestone', e.target.value)}
                      placeholder="e.g., Families fed, Volunteer hours"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={metric.value}
                      onChange={(e) => handleUpdateMetric(index, 'value', parseFloat(e.target.value) || 0)}
                      placeholder="Value"
                      min="0"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="text"
                      value={metric.unit || ''}
                      onChange={(e) => handleUpdateMetric(index, 'unit', e.target.value)}
                      placeholder="Unit"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {metrics.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMetric(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Financial */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Spent (Optional)
              </label>
              <div className="relative">
                <DollarSign size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={amountSpent}
                  onChange={(e) => setAmountSpent(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <button
              type="button"
              onClick={() => setShowLocationForm(!showLocationForm)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center mb-2"
            >
              <MapPin size={16} className="mr-1" /> 
              {showLocationForm ? 'Hide' : 'Add'} Location
            </button>
            
            {showLocationForm && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    value={location?.lat || ''}
                    onChange={(e) => setLocation({ ...location, lat: parseFloat(e.target.value), lng: location?.lng || 0 })}
                    step="any"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    value={location?.lng || ''}
                    onChange={(e) => setLocation({ ...location, lng: parseFloat(e.target.value), lat: location?.lat || 0 })}
                    step="any"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Place Name</label>
                  <input
                    type="text"
                    value={location?.placeName || ''}
                    onChange={(e) => setLocation({ ...location!, placeName: e.target.value })}
                    placeholder="St. Mary's School, Tallaght"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Proof - Media */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                <Image size={16} className="inline mr-1" />
                Photos/Videos (Optional)
              </label>
              <button
                type="button"
                onClick={handleAddMedia}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                <Plus size={16} className="mr-1" /> Add Media
              </button>
            </div>
            <div className="space-y-3">
              {media.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-start">
                  <select
                    value={item.type}
                    onChange={(e) => handleUpdateMedia(index, 'type', e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                  <input
                    type="url"
                    value={item.url}
                    onChange={(e) => handleUpdateMedia(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  {media.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Proof - Receipts */}
          {amountSpent && parseFloat(amountSpent) > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  <FileText size={16} className="inline mr-1" />
                  Receipts/Invoices * (Required when money spent)
                </label>
                <button
                  type="button"
                  onClick={handleAddReceipt}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <Plus size={16} className="mr-1" /> Add Receipt
                </button>
              </div>
              <div className="space-y-2">
                {receipts.map((receipt, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={receipt}
                      onChange={(e) => handleUpdateReceipt(index, e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveReceipt(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Draft' : 'Create Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImpactUpdateForm;