// client/src/components/auth/ClubRegistrationForm.tsx
import React, { useState, useCallback } from 'react';
import { Users, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth, useUI } from '../../store/app_store';

interface ClubRegisterFormProps {
  onSwitchToLogin?: () => void;
}

export default function ClubRegisterForm({ onSwitchToLogin }: ClubRegisterFormProps) {
  const { register } = useAuth();
  const { isLoading, error, clearError } = useUI();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Simplified input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error immediately when user starts typing
    setErrors(prev => {
      if (prev[name]) {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      }
      return prev;
    });
    
    if (error) clearError();
  }, [error, clearError]); // ✅ Removed 'errors' dependency

  // Fixed validation - removed dependency on errors state to prevent re-render loops
  const validateField = useCallback((field: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'name':
        if (!formData.name.trim()) {
          newErrors.name = 'Club name is required';
        } else if (formData.name.trim().length < 2) {
          newErrors.name = 'Club name must be at least 2 characters';
        } else {
          delete newErrors.name;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
          newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;

      case 'password':
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
          newErrors.password = 'Password must contain uppercase, lowercase, and number';
        } else {
          delete newErrors.password;
        }
        break;

      case 'confirmPassword':
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newErrors.confirmPassword;
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]); // ✅ Removed 'errors' dependency

  // Simplified blur handler - now validateField is declared above
  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    
    // Only validate on blur, not during typing
    setTimeout(() => validateField(field), 0);
  }, [validateField]);

  // Fixed form validation - check if form is complete and valid
  const isFormValid = useCallback(() => {
    const hasAllFields = formData.name.trim() && 
                        formData.email.trim() && 
                        formData.password && 
                        formData.confirmPassword;
    
    const passwordsMatch = formData.password === formData.confirmPassword;
    const passwordValid = formData.password.length >= 8 && 
                         /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password);
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    
    return hasAllFields && passwordsMatch && passwordValid && emailValid;
  }, [formData]);

  const validateForm = () => {
    const fields = ['name', 'email', 'password', 'confirmPassword'];
    let isValid = true;
    
    fields.forEach(field => {
      if (!validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password
      });
      // Registration success is handled by the store (redirect to dashboard)
    } catch (error) {
      // Error is already set in the store by the register function
      console.error('Registration failed:', error);
    }
  };

  // Memoized password strength calculation
  const getPasswordStrength = useCallback(() => {
    const password = formData.password;
    let score = 0;
    
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    return score;
  }, [formData.password]);

  const getPasswordStrengthText = useCallback(() => {
    const strength = getPasswordStrength();
    if (strength < 2) return { text: 'Weak', color: 'text-red-600' };
    if (strength < 4) return { text: 'Medium', color: 'text-yellow-600' };
    return { text: 'Strong', color: 'text-green-600' };
  }, [getPasswordStrength]);

  // Memoized password toggle handlers
  const togglePassword = useCallback(() => setShowPassword(prev => !prev), []);
  const toggleConfirmPassword = useCallback(() => setShowConfirmPassword(prev => !prev), []);

  // Optimized InputField component to prevent re-renders
  const InputField = React.memo(({ 
    label, 
    name, 
    type = 'text', 
    icon: Icon, 
    placeholder,
    autoComplete,
    showToggle = false,
    showPassword: isPasswordVisible = false,
    onToggleShow
  }: {
    label: string;
    name: string;
    type?: string;
    icon: any;
    placeholder: string;
    autoComplete?: string;
    showToggle?: boolean;
    showPassword?: boolean;
    onToggleShow?: () => void;
  }) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} *
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <input
          type={showToggle ? (isPasswordVisible ? 'text' : 'password') : type}
          id={name}
          name={name}
          autoComplete={autoComplete}
          value={formData[name as keyof typeof formData]}
          onChange={handleInputChange}
          onBlur={() => handleBlur(name)}
          className={`w-full pl-10 ${showToggle ? 'pr-10' : 'pr-3'} py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${
            errors[name] && touched[name]
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }`}
          placeholder={placeholder}
          disabled={isLoading}
        />
        {showToggle && onToggleShow && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          >
            {isPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      {errors[name] && touched[name] && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {errors[name]}
        </p>
      )}
    </div>
  ));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="px-6 py-8 border-b border-gray-200">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Join FundRaisely</h2>
            <p className="mt-2 text-sm text-gray-600">
              Register your club and start fundraising today
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* ✅ FIXED: Proper form element with onSubmit */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <InputField
              label="Club Name"
              name="name"
              icon={Users}
              placeholder="e.g., Greenfield Community Club"
              autoComplete="organization"
            />

            <InputField
              label="Email Address"
              name="email"
              type="email"
              icon={Mail}
              placeholder="club@example.com"
              autoComplete="email"
            />

            <div>
              <InputField
                label="Password"
                name="password"
                icon={Lock}
                placeholder="Create a strong password"
                autoComplete="new-password"
                showToggle={true}
                showPassword={showPassword}
                onToggleShow={togglePassword}
              />
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Password strength:</span>
                    <span className={`text-xs font-medium ${getPasswordStrengthText().color}`}>
                      {getPasswordStrengthText().text}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full transition-all duration-300 ${
                        getPasswordStrength() < 2 ? 'bg-red-500' :
                        getPasswordStrength() < 4 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(getPasswordStrength() / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <InputField
              label="Confirm Password"
              name="confirmPassword"
              icon={Lock}
              placeholder="Confirm your password"
              autoComplete="new-password"
              showToggle={true}
              showPassword={showConfirmPassword}
              onToggleShow={toggleConfirmPassword}
            />

            {/* ✅ FIXED: Better button disabled logic */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Club Account
                </div>
              )}
            </button>
          </form>

          {/* Benefits Section */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">What you get:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Track campaigns and events
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Manage supporters and volunteers
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Real-time fundraising insights
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Easy prize and task management
              </li>
            </ul>
          </div>

          {/* Login Link */}
          {onSwitchToLogin && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in here
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}