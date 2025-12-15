// File: client/src/components/supporters/forms/CreateSupporterForm.tsx
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Heart, Users, Calendar, Shield, Save, X, Tag, Building } from 'lucide-react';
import { CreateSupporterData } from '../../../services/supporterService';
import SuccessModal from '../../shared/SuccessModal';

interface CreateSupporterFormProps {
  onSubmit: (supporterData: CreateSupporterData) => Promise<any>;
  onCancel: () => void;
  editMode?: boolean;
  existingSupporter?: any;
}

interface FormErrors {
  [key: string]: string;
}

const CreateSupporterForm: React.FC<CreateSupporterFormProps> = ({ 
  onSubmit,
  onCancel,
  editMode = false,
  existingSupporter = null
}) => {
  // Initialize form data based on mode
  const getInitialFormData = (): CreateSupporterData => {
    if (editMode && existingSupporter) {
      return {
        name: existingSupporter.name || '',
        type: existingSupporter.type || 'volunteer',
        notes: existingSupporter.notes || '',
        
        // Contact information
        email: existingSupporter.email || '',
        phone: existingSupporter.phone || '',
        address_line1: existingSupporter.address_line1 || '',
        address_line2: existingSupporter.address_line2 || '',
        city: existingSupporter.city || '',
        state_province: existingSupporter.state_province || '',
        postal_code: existingSupporter.postal_code || '',
        country: existingSupporter.country || 'UK',
        preferred_contact_method: existingSupporter.preferred_contact_method || 'email',
        
        // Relationship management
        relationship_strength: existingSupporter.relationship_strength || 'prospect',
        contact_source: existingSupporter.contact_source || 'other',
        referral_source: existingSupporter.referral_source || '',
        
        // Communication preferences
        email_subscribed: existingSupporter.email_subscribed !== false,
        sms_subscribed: existingSupporter.sms_subscribed || false,
        newsletter_subscribed: existingSupporter.newsletter_subscribed !== false,
        event_notifications: existingSupporter.event_notifications !== false,
        do_not_contact: existingSupporter.do_not_contact || false,
        
        // Lifecycle & Priority
        lifecycle_stage: existingSupporter.lifecycle_stage || 'prospect',
        priority_level: existingSupporter.priority_level || 'medium',
        next_contact_date: existingSupporter.next_contact_date || '',
        
        // Flexible data
        tags: existingSupporter.tags || [],
        interests: existingSupporter.interests || [],
        skills: existingSupporter.skills || [],
        
        // GDPR
        gdpr_consent: existingSupporter.gdpr_consent || false,
        data_protection_notes: existingSupporter.data_protection_notes || ''
      };
    }
    
    return {
      name: '',
      type: 'volunteer',
      notes: '',
      email: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: 'UK',
      preferred_contact_method: 'email',
      relationship_strength: 'prospect',
      contact_source: 'other',
      referral_source: '',
      email_subscribed: true,
      sms_subscribed: false,
      newsletter_subscribed: true,
      event_notifications: true,
      do_not_contact: false,
      lifecycle_stage: 'prospect',
      priority_level: 'medium',
      next_contact_date: '',
      tags: [],
      interests: [],
      skills: [],
      gdpr_consent: false,
      data_protection_notes: ''
    };
  };

  const [formData, setFormData] = useState<CreateSupporterData>(getInitialFormData());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdSupporterName, setCreatedSupporterName] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'relationship' | 'preferences'>('basic');
  const [tagsInput, setTagsInput] = useState('');
const [interestsInput, setInterestsInput] = useState('');
const [skillsInput, setSkillsInput] = useState('');

  // Update form data when existingSupporter changes (for edit mode)
  useEffect(() => {
  if (editMode && existingSupporter) {
    setFormData(getInitialFormData());
    setTagsInput(existingSupporter.tags?.join(', ') || '');
    setInterestsInput(existingSupporter.interests?.join(', ') || '');
    setSkillsInput(existingSupporter.skills?.join(', ') || '');
  }
}, [editMode, existingSupporter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    
    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTagInput = (field: 'tags' | 'interests' | 'skills', value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setFormData(prev => ({
      ...prev,
      [field]: tags
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.type) {
      newErrors.type = 'Supporter type is required';
    }

    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Phone validation
    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    // GDPR requirement for donors
    if (formData.type === 'donor' && !formData.gdpr_consent) {
      newErrors.gdpr_consent = 'GDPR consent is required for donors';
    }

    // Next contact date validation
    if (formData.next_contact_date) {
      const contactDate = new Date(formData.next_contact_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (contactDate < today) {
        newErrors.next_contact_date = 'Next contact date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log(`📤 Submitting supporter form data (${editMode ? 'edit' : 'create'} mode)`);
      
      // Clean up form data before submitting
      const cleanedData: CreateSupporterData = {
        ...formData,
        name: formData.name.trim(),
        notes: formData.notes?.trim() || '',
        email: formData.email?.trim() || '',
        phone: formData.phone?.trim() || '',
        address_line1: formData.address_line1?.trim() || '',
        address_line2: formData.address_line2?.trim() || '',
        city: formData.city?.trim() || '',
        state_province: formData.state_province?.trim() || '',
        postal_code: formData.postal_code?.trim() || '',
        referral_source: formData.referral_source?.trim() || '',
        data_protection_notes: formData.data_protection_notes?.trim() || '',
         tags: tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
  interests: interestsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
  skills: skillsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      };

      console.log('🔄 Cleaned form data:', cleanedData);

      // Call parent's submit handler
      const result = await onSubmit(cleanedData);
      
      console.log(`✅ Supporter ${editMode ? 'updated' : 'created'} successfully`);
      
      // Store supporter name for success modal
      setCreatedSupporterName(formData.name.trim());
      
      // Show success modal
      setShowSuccessModal(true);

    } catch (error) {
      console.error(`❌ Supporter form submission failed (${editMode ? 'edit' : 'create'}):`, error);
      // Don't show success modal on error - let parent handle error display
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessConfirm = () => {
    console.log(`🧹 User confirmed success, clearing form and closing (${editMode ? 'edit' : 'create'} mode)`);
    
    // For create mode, clear form. For edit mode, just close
    if (!editMode) {
      setFormData(getInitialFormData());
    }
    
    // Clear any errors and reset to first tab
    setErrors({});
    setActiveTab('basic');
    
    // Hide success modal and close form
    setShowSuccessModal(false);
    onCancel();
  };

  // Tab configuration
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'relationship', label: 'Relationship', icon: Heart },
    { id: 'preferences', label: 'Preferences', icon: Shield }
  ] as const;

  const getTabErrors = (tabId: string): number => {
    const tabFields = {
      basic: ['name', 'type', 'notes'],
      contact: ['email', 'phone', 'address_line1', 'city', 'postal_code'],
      relationship: ['relationship_strength', 'lifecycle_stage', 'next_contact_date'],
      preferences: ['gdpr_consent']
    };
    
    return tabFields[tabId as keyof typeof tabFields]?.filter(field => errors[field]).length || 0;
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editMode ? 'Edit Supporter' : 'Add New Supporter'}
              </h2>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
                disabled={isSubmitting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 flex-shrink-0">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const errorCount = getTabErrors(tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  >
                    <TabIcon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {errorCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                        {errorCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6">
              {/* Debug Info */}
              {import.meta.env.DEV && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs mb-6">
                  <strong>Debug Info:</strong> 
                  Mode: {editMode ? 'Edit' : 'Create'} | 
                  Active Tab: {activeTab}
                  {editMode && existingSupporter && (
                    <> | Editing: {existingSupporter.name}</>
                  )}
                </div>
              )}

              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                          } ${isSubmitting ? 'bg-gray-50' : ''}`}
                          placeholder="e.g., John Smith"
                        />
                      </div>
                      {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                    </div>

                    {/* Type */}
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                        Supporter Type *
                      </label>
                      <div className="relative">
                        <Users className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <select
                          id="type"
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.type ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                          } ${isSubmitting ? 'bg-gray-50' : ''}`}
                        >
                          <option value="volunteer">Volunteer</option>
                          <option value="donor">Donor</option>
                          <option value="sponsor">Sponsor</option>
                        </select>
                      </div>
                      {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      rows={3}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isSubmitting ? 'bg-gray-50' : ''
                      }`}
                      placeholder="Any additional notes about this supporter..."
                    />
                  </div>

                  {/* Tags, Interests, Skills */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags
                      </label>
                 <input
  type="text"
  value={tagsInput}
  onChange={(e) => setTagsInput(e.target.value)}
  disabled={isSubmitting}
  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  placeholder="VIP, Local Business, etc."
/>

                      <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                    </div>

                  <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Interests
  </label>
  <input
    type="text"
    value={interestsInput}
    onChange={(e) => setInterestsInput(e.target.value)}
    disabled={isSubmitting}
    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    placeholder="Sports, Music, Community"
  />
  <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
</div>

                 <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Skills
  </label>
  <input
    type="text"
    value={skillsInput}
    onChange={(e) => setSkillsInput(e.target.value)}
    disabled={isSubmitting}
    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    placeholder="Event Planning, Marketing"
  />
  <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
</div>
                  </div>
                </div>
              )}

              {/* Contact Info Tab */}
              {activeTab === 'contact' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                          } ${isSubmitting ? 'bg-gray-50' : ''}`}
                          placeholder="john@example.com"
                        />
                      </div>
                      {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.phone ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                          } ${isSubmitting ? 'bg-gray-50' : ''}`}
                          placeholder="+44 123 456 7890"
                        />
                      </div>
                      {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Address (Optional)
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <input
                        type="text"
                        name="address_line1"
                        value={formData.address_line1}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Address Line 1"
                      />
                      
                      <input
                        type="text"
                        name="address_line2"
                        value={formData.address_line2}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Address Line 2"
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="City"
                        />
                        
                        <input
                          type="text"
                          name="state_province"
                          value={formData.state_province}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="County/State"
                        />
                        
                        <input
                          type="text"
                          name="postal_code"
                          value={formData.postal_code}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Postcode"
                        />
                      </div>

                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="UK">United Kingdom</option>
                        <option value="IE">Ireland</option>
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="AU">Australia</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Preferred Contact Method */}
                  <div>
                    <label htmlFor="preferred_contact_method" className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Contact Method
                    </label>
                    <select
                      id="preferred_contact_method"
                      name="preferred_contact_method"
                      value={formData.preferred_contact_method}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="sms">SMS</option>
                      <option value="post">Post</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Relationship Tab */}
              {activeTab === 'relationship' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Relationship Strength */}
                    <div>
                      <label htmlFor="relationship_strength" className="block text-sm font-medium text-gray-700 mb-1">
                        Relationship Strength
                      </label>
                      <select
                        id="relationship_strength"
                        name="relationship_strength"
                        value={formData.relationship_strength}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="prospect">Prospect</option>
                        <option value="new">New</option>
                        <option value="regular">Regular</option>
                        <option value="major">Major Donor</option>
                        <option value="lapsed">Lapsed</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    {/* Lifecycle Stage */}
                    <div>
                      <label htmlFor="lifecycle_stage" className="block text-sm font-medium text-gray-700 mb-1">
                        Lifecycle Stage
                      </label>
                      <select
                        id="lifecycle_stage"
                        name="lifecycle_stage"
                        value={formData.lifecycle_stage}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="prospect">Prospect</option>
                        <option value="first_time">First Time</option>
                        <option value="repeat">Repeat</option>
                        <option value="major">Major</option>
                        <option value="lapsed">Lapsed</option>
                        <option value="champion">Champion</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Source */}
                    <div>
                      <label htmlFor="contact_source" className="block text-sm font-medium text-gray-700 mb-1">
                        How did they find us?
                      </label>
                      <select
                        id="contact_source"
                        name="contact_source"
                        value={formData.contact_source}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="website">Website</option>
                        <option value="event">Event</option>
                        <option value="referral">Referral</option>
                        <option value="social_media">Social Media</option>
                        <option value="cold_outreach">Cold Outreach</option>
                        <option value="walk_in">Walk In</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Priority Level */}
                    <div>
                      <label htmlFor="priority_level" className="block text-sm font-medium text-gray-700 mb-1">
                        Priority Level
                      </label>
                      <select
                        id="priority_level"
                        name="priority_level"
                        value={formData.priority_level}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  {/* Referral Source */}
                  <div>
                    <label htmlFor="referral_source" className="block text-sm font-medium text-gray-700 mb-1">
                      Referral Source (if applicable)
                    </label>
                    <input
                      type="text"
                      id="referral_source"
                      name="referral_source"
                      value={formData.referral_source}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Who referred them to us?"
                    />
                  </div>

                  {/* Next Contact Date */}
                  <div>
                    <label htmlFor="next_contact_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Next Contact Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input
                        type="date"
                        id="next_contact_date"
                        name="next_contact_date"
                        value={formData.next_contact_date}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.next_contact_date ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        } ${isSubmitting ? 'bg-gray-50' : ''}`}
                      />
                    </div>
                    {errors.next_contact_date && <p className="mt-1 text-sm text-red-600">{errors.next_contact_date}</p>}
                    <p className="text-xs text-gray-500 mt-1">When should we follow up with this supporter?</p>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  {/* Communication Preferences */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Communication Preferences
                    </h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="email_subscribed"
                          checked={formData.email_subscribed}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Email updates</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="sms_subscribed"
                          checked={formData.sms_subscribed}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">SMS notifications</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="newsletter_subscribed"
                          checked={formData.newsletter_subscribed}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Newsletter subscription</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="event_notifications"
                          checked={formData.event_notifications}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Event notifications</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="do_not_contact"
                          checked={formData.do_not_contact}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-red-700">Do not contact (opt-out)</span>
                      </label>
                    </div>
                  </div>

                  {/* GDPR Compliance */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Data Protection & GDPR
                    </h4>
                    
                    <div className="space-y-3">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="gdpr_consent"
                          checked={formData.gdpr_consent}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className={`h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                            errors.gdpr_consent ? 'border-red-300' : ''
                          }`}
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          I consent to this organization storing and processing my personal data in accordance with their privacy policy.
                          {formData.type === 'donor' && <span className="text-red-600 ml-1">*</span>}
                        </span>
                      </label>
                      {errors.gdpr_consent && <p className="text-sm text-red-600">{errors.gdpr_consent}</p>}

                      <div>
                        <label htmlFor="data_protection_notes" className="block text-sm font-medium text-gray-700 mb-1">
                          Data Protection Notes
                        </label>
                        <textarea
                          id="data_protection_notes"
                          name="data_protection_notes"
                          value={formData.data_protection_notes}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Any specific data protection requests or notes..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                * Required fields
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`px-6 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center disabled:opacity-50 ${
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
                    editMode ? 'Update Supporter' : 'Create Supporter'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        title={editMode ? "Supporter Updated Successfully!" : "Supporter Created Successfully!"}
        message={editMode 
          ? `"${createdSupporterName}" has been updated with your changes.`
          : `"${createdSupporterName}" has been added to your supporter network. You can now track their engagement and manage communications.`
        }
        onConfirm={handleSuccessConfirm}
        color={editMode ? "blue" : "green"}
      />
    </>
  );
};

export default CreateSupporterForm;