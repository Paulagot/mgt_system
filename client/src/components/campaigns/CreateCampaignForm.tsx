import React, { useState, useEffect } from 'react';
import { Target, DollarSign, FileText, Save, X, Calendar } from 'lucide-react';
import SuccessModal from '../shared/SuccessModal';
import { Campaign } from '../../types/types';

interface CreateCampaignFormProps {
  onSubmit: (campaignData: any) => Promise<any>; // Now expects Promise for success handling
  onCancel: () => void;
  editMode?: boolean; // NEW: Optional edit mode
  existingCampaign?: Campaign; // NEW: Optional existing campaign for editing
}

export default function CreateCampaignForm({ 
  onSubmit, 
  onCancel, 
  editMode = false, 
  existingCampaign 
}: CreateCampaignFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_amount: '',
    start_date: '',
    end_date: '',
    category: '',
    tags: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdCampaignName, setCreatedCampaignName] = useState('');

  // NEW: Pre-populate form data when in edit mode
  useEffect(() => {
    if (editMode && existingCampaign) {
      console.log('🖊️ Pre-populating form with existing campaign data:', existingCampaign);
      
      // Format dates for input fields
      const formatDateForInput = (date: string | Date | undefined) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0]; // YYYY-MM-DD format
      };

      // Format tags array to comma-separated string
      const formatTagsForInput = (tags: string[] | undefined) => {
        if (!tags || !Array.isArray(tags)) return '';
        return tags.join(', ');
      };

      setFormData({
        name: existingCampaign.name || '',
        description: existingCampaign.description || '',
        target_amount: existingCampaign.target_amount?.toString() || '',
        start_date: formatDateForInput(existingCampaign.start_date),
        end_date: formatDateForInput(existingCampaign.end_date),
        category: existingCampaign.category || '',
        tags: formatTagsForInput(existingCampaign.tags)
      });
    }
  }, [editMode, existingCampaign]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Campaign description is required';
    }

    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      newErrors.target_amount = 'Target amount must be greater than 0';
    }

    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log(`📤 ${editMode ? 'Updating' : 'Creating'} campaign data to parent handler`);
      
      // Clean up form data before submitting (include all fields for backend)
      const cleanedData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        target_amount: formData.target_amount, // Parent will convert to number
        category: formData.category.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };

      console.log(`🔄 Cleaned campaign data for ${editMode ? 'update' : 'create'}:`, cleanedData);

      // Call parent's submit handler and wait for result
      const result = await onSubmit(cleanedData);
      
      console.log(`✅ Campaign ${editMode ? 'updated' : 'created'} successfully, showing success modal`);
      
      // Store campaign name for success modal
      setCreatedCampaignName(formData.name.trim());
      
      // Show success modal instead of clearing immediately
      setShowSuccessModal(true);

    } catch (error) {
      console.error(`❌ Campaign form submission failed:`, error);
      // Don't show success modal on error - let parent handle error display
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessConfirm = () => {
    console.log(`🧹 User confirmed success, clearing form and closing`);
    
    // Clear form data only if creating (not editing)
    if (!editMode) {
      setFormData({
        name: '',
        description: '',
        target_amount: '',
        start_date: '',
        end_date: '',
        category: '',
        tags: ''
      });
    }
    
    // Clear any errors
    setErrors({});
    
    // Hide success modal
    setShowSuccessModal(false);
    
    // Close the form
    onCancel();
  };

  const campaignCategories = [
    { value: '', label: 'Select category...' },
    { value: 'building', label: 'Building & Infrastructure' },
    { value: 'equipment', label: 'Equipment & Supplies' },
    { value: 'program', label: 'Programs & Activities' },
    { value: 'emergency', label: 'Emergency Fund' },
    { value: 'community', label: 'Community Support' },
    { value: 'education', label: 'Education & Training' },
    { value: 'other', label: 'Other' }
  ];

  // Dynamic UI text based on mode
  const formTitle = editMode ? 'Edit Campaign' : 'Create New Campaign';
  const formSubtitle = editMode ? 'Update your campaign details' : 'Set up a fundraising goal for your club';
  const submitButtonText = editMode ? 'Update Campaign' : 'Create Campaign';
  const successTitle = editMode ? 'Campaign Updated Successfully!' : 'Campaign Created Successfully!';
  const successMessage = editMode 
    ? `"${createdCampaignName}" has been updated successfully.`
    : `"${createdCampaignName}" has been created and saved. You can now start planning events for this campaign.`;

  return (
    <>
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className={`px-6 py-4 border-b border-gray-200 ${editMode ? 'bg-blue-50' : 'bg-green-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg mr-3 ${editMode ? 'bg-blue-100' : 'bg-green-100'}`}>
                  <Target className={`h-6 w-6 ${editMode ? 'text-blue-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{formTitle}</h2>
                  <p className="text-sm text-gray-600">{formSubtitle}</p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
                disabled={isSubmitting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
            {/* Campaign Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                  editMode ? 'focus:ring-blue-500' : 'focus:ring-green-500'
                } ${
                  errors.name ? 'border-red-300 focus:border-red-500' : `border-gray-300 ${editMode ? 'focus:border-blue-500' : 'focus:border-green-500'}`
                } ${isSubmitting ? 'bg-gray-50' : ''}`}
                placeholder="e.g., Community Center Renovation"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Target Amount and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="target_amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Amount *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    id="target_amount"
                    name="target_amount"
                    value={formData.target_amount}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                      editMode ? 'focus:ring-blue-500' : 'focus:ring-green-500'
                    } ${
                      errors.target_amount ? 'border-red-300 focus:border-red-500' : `border-gray-300 ${editMode ? 'focus:border-blue-500' : 'focus:border-green-500'}`
                    } ${isSubmitting ? 'bg-gray-50' : ''}`}
                    placeholder="10000.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                {errors.target_amount && <p className="mt-1 text-sm text-red-600">{errors.target_amount}</p>}
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                    editMode ? 'focus:ring-blue-500 focus:border-blue-500' : 'focus:ring-green-500 focus:border-green-500'
                  } ${
                    isSubmitting ? 'bg-gray-50' : ''
                  }`}
                >
                  {campaignCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <div className="relative">
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                    editMode ? 'focus:ring-blue-500' : 'focus:ring-green-500'
                  } ${
                    errors.description ? 'border-red-300 focus:border-red-500' : `border-gray-300 ${editMode ? 'focus:border-blue-500' : 'focus:border-green-500'}`
                  } ${isSubmitting ? 'bg-gray-50' : ''}`}
                  placeholder="Describe what this campaign aims to achieve and why it's important to your community..."
                />
                <FileText className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
              </div>
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              <p className="mt-1 text-sm text-gray-500">
                Provide details about your goals, how funds will be used, and expected impact.
              </p>
            </div>

            {/* Timeline (Optional) */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Campaign Timeline (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-600 mb-1">
                    Start Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="start_date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                        editMode ? 'focus:ring-blue-500 focus:border-blue-500' : 'focus:ring-green-500 focus:border-green-500'
                      } ${
                        isSubmitting ? 'bg-gray-50' : ''
                      }`}
                    />
                    <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-600 mb-1">
                    Target End Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="end_date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                        editMode ? 'focus:ring-blue-500' : 'focus:ring-green-500'
                      } ${
                        errors.end_date ? 'border-red-300 focus:border-red-500' : `border-gray-300 ${editMode ? 'focus:border-blue-500' : 'focus:border-green-500'}`
                      } ${isSubmitting ? 'bg-gray-50' : ''}`}
                    />
                    <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                  editMode ? 'focus:ring-blue-500 focus:border-blue-500' : 'focus:ring-green-500 focus:border-green-500'
                } ${
                  isSubmitting ? 'bg-gray-50' : ''
                }`}
                placeholder="e.g., renovation, community, urgent"
              />
              <p className="mt-1 text-sm text-gray-500">
                Separate tags with commas. These help organize and filter your campaigns.
              </p>
            </div>

            {/* Campaign Tips - Only show when creating */}
            {!editMode && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Campaign Tips</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Set realistic but ambitious goals based on your community size</li>
                  <li>• Include specific details about how funds will be used</li>
                  <li>• Plan multiple events to reach your target over time</li>
                  <li>• Consider breaking large goals into smaller milestones</li>
                </ul>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 flex items-center disabled:opacity-50 ${
                  editMode 
                    ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                    : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                }`}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  submitButtonText
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        title={successTitle}
        message={successMessage}
        onConfirm={handleSuccessConfirm}
        color={editMode ? "blue" : "green"}
      />
    </>
  );
}