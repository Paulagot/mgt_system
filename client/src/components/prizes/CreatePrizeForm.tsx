import React, { useState, useEffect } from 'react';
import { Save, X, Gift, DollarSign, User } from 'lucide-react';
import { CreatePrizeData, Prize, Supporter } from '../../types/types';
import supporterService from '../../services/supporterService';
import { useAuth } from '../../store/app_store';
import SuccessModal from '../shared/SuccessModal';

interface CreatePrizeFormProps {
  onSubmit: (prizeData: CreatePrizeData) => Promise<any>;
  onCancel: () => void;
  editMode?: boolean;
  existingPrize?: Prize;
  eventTitle?: string;
}

interface FormErrors {
  [key: string]: string;
}

const CreatePrizeForm: React.FC<CreatePrizeFormProps> = ({
  onSubmit,
  onCancel,
  editMode = false,
  existingPrize = null,
  eventTitle = ''
}) => {
  const { user } = useAuth();
  
 const getInitialFormData = (): CreatePrizeData => {
  if (editMode && existingPrize) {
    return {
      name: existingPrize.name,
      value: existingPrize.value,
      donated_by: existingPrize.donated_by || undefined
    };
  }
  
  return {
    name: '',
    value: undefined, // FIXED: Use undefined instead of 0
    donated_by: undefined
  };
};

  const [formData, setFormData] = useState<CreatePrizeData>(getInitialFormData());
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Load supporters for donor dropdown
  useEffect(() => {
    const loadSupporters = async () => {
      if (!user?.club_id) return;
      
      try {
        const response = await supporterService.getSupportersByClub(user.club_id);
        setSupporters(response.supporters || []);
      } catch (error) {
        console.error('Failed to load supporters:', error);
      }
    };
    loadSupporters();
  }, [user?.club_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  
  let processedValue: any = value;
  if (name === 'value') {
    // FIXED: Handle empty string and convert properly
    processedValue = value === '' ? undefined : parseFloat(value);
  } else if (name === 'donated_by' && value === '') {
    processedValue = undefined;
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Prize name is required';
    }

const validateForm = (): boolean => {
  const newErrors: FormErrors = {};

  if (!formData.name.trim()) {
    newErrors.name = 'Prize name is required'; // ALSO FIXED: should be 'name' not 'title'
  }

  // FIXED: Check if value exists and is a number before comparing
  if (formData.value !== undefined && formData.value !== null && formData.value < 0) {
    newErrors.value = 'Prize value cannot be negative';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const cleanedData = {
        name: formData.name.trim(),
        value: formData.value,
        donated_by: formData.donated_by || undefined
      };

      await onSubmit(cleanedData);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessConfirm = () => {
    if (!editMode) {
      setFormData({
        name: '',
        value: 0,
        donated_by: undefined
      });
    }
    
    setErrors({});
    setShowSuccessModal(false);
    onCancel();
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editMode ? 'Edit Prize' : 'Add New Prize'}
              </h2>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
                disabled={isSubmitting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            {eventTitle && (
              <p className="mt-1 text-sm text-gray-500">
                {editMode ? 'Update prize details' : `Add prize for ${eventTitle}`}
              </p>
            )}
          </div>

          {/* Form */}
          <div className="px-6 py-4 space-y-4">
            {/* Prize Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Prize Name *
              </label>
              <div className="relative">
                <Gift className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
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
                  placeholder="e.g., Weekend getaway voucher"
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Prize Value */}
            <div>
              <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
                Prize Value (£)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
  type="number"
  id="value"
  name="value"
  min="0"
  step="0.01"
  value={formData.value !== undefined ? formData.value : ''} // FIXED: Show empty when undefined
  onChange={handleInputChange}
  disabled={isSubmitting}
  className={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    errors.value ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
  } ${isSubmitting ? 'bg-gray-50' : ''}`}
  placeholder="Enter prize value"
/>
              </div>
              {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value}</p>}
              <p className="mt-1 text-xs text-gray-500">
                Leave as 0 if value is not specified
              </p>
            </div>

            {/* Donated By */}
            <div>
              <label htmlFor="donated_by" className="block text-sm font-medium text-gray-700 mb-1">
                Donated By
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <select
                  id="donated_by"
                  name="donated_by"
                  value={formData.donated_by || ''}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isSubmitting ? 'bg-gray-50' : ''
                  }`}
                >
                  <option value="">Anonymous / Not specified</option>
                  {supporters.map((supporter) => (
                    <option key={supporter.id} value={supporter.id}>
                      {supporter.name} {supporter.email && `(${supporter.email})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editMode ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                editMode ? 'Update Prize' : 'Add Prize'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        title={editMode ? "Prize Updated Successfully!" : "Prize Added Successfully!"}
        message={editMode 
          ? `"${formData.name}" has been updated.`
          : `"${formData.name}" has been added to the event.`
        }
        onConfirm={handleSuccessConfirm}
        color="blue"
      />
    </>
  );
};

export default CreatePrizeForm;