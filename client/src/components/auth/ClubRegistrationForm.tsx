// client/src/components/auth/ClubRegistrationForm.tsx
import React, { useState, useCallback } from 'react';
import { Users, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth, useUI } from '../../store/app_store';

interface ClubRegisterFormProps {
  onSwitchToLogin?: () => void;
}

// Reusable input
const InputField = React.memo(({
  label,
  name,
  type = 'text',
  icon: Icon,
  placeholder,
  autoComplete,
  showToggle = false,
  showPassword: isPasswordVisible = false,
  onToggleShow,
  value,
  onChange,
  onBlur,
  error,
  touched,
  disabled
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
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
}) => (
  <div>
    <label htmlFor={name} className="text-fg/80 mb-1 block text-sm font-medium">
      {label} *
    </label>
    <div className="relative">
      <Icon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      <input
        type={showToggle ? (isPasswordVisible ? 'text' : 'password') : type}
        id={name}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`w-full pl-10 ${showToggle ? 'pr-10' : 'pr-3'} rounded-md border py-2 shadow-sm focus:outline-none focus:ring-2 ${
          error && touched
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        }`}
        placeholder={placeholder}
        disabled={disabled}
      />
      {showToggle && onToggleShow && (
        <button
          type="button"
          onClick={onToggleShow}
          className="hover:text-fg/70 absolute right-3 top-2.5 text-gray-400"
        >
          {isPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}
    </div>
    {error && touched && (
      <p className="mt-1 flex items-center text-sm text-red-600">
        <AlertCircle className="mr-1 h-4 w-4" />
        {error}
      </p>
    )}
  </div>
));

// GDPR / consent checkbox
const GDPRCheckbox = React.memo(({
  id,
  checked,
  onChange,
  required = false,
  error,
  children
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <div className="flex items-start space-x-3">
      <div className="flex h-5 items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={`h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-300' : ''}`}
        />
      </div>
      <label htmlFor={id} className={`text-sm ${error ? 'text-red-600' : 'text-fg/80'}`}>
        {children}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
    </div>
    {error && (
      <p className="ml-7 flex items-center text-sm text-red-600">
        <AlertCircle className="mr-1 h-4 w-4" />
        {error}
      </p>
    )}
  </div>
));

export default function ClubRegisterForm({ onSwitchToLogin }: ClubRegisterFormProps) {
  const { register } = useAuth();
  const { isLoading, error, clearError } = useUI();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Local success banner (Option A)
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  // GDPR/consent
  const [gdprConsent, setGdprConsent] = useState(false);
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (error) clearError?.();
    if (localSuccess) setLocalSuccess(null);
  }, [errors, error, clearError, localSuccess]);

  // Consent changes
  const handleGdprConsentChange = useCallback((checked: boolean) => {
    setGdprConsent(checked);
    if (errors.gdprConsent) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.gdprConsent;
        return next;
      });
    }
  }, [errors.gdprConsent]);

  const handlePrivacyPolicyChange = useCallback((checked: boolean) => {
    setPrivacyPolicyAccepted(checked);
    if (errors.privacyPolicy) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.privacyPolicy;
        return next;
      });
    }
  }, [errors.privacyPolicy]);

  // Field validation
  const validateField = useCallback((field: string, current: typeof formData) => {
    const next: Record<string, string> = {};
    switch (field) {
      case 'name':
        if (!current.name.trim()) next.name = 'Club name is required';
        else if (current.name.trim().length < 2) next.name = 'Club name must be at least 2 characters';
        break;
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!current.email) next.email = 'Email is required';
        else if (!emailRegex.test(current.email)) next.email = 'Please enter a valid email address';
        break;
      }
      case 'password':
        if (!current.password) next.password = 'Password is required';
        else if (current.password.length < 8) next.password = 'Password must be at least 8 characters';
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(current.password)) {
          next.password = 'Password must contain uppercase, lowercase, and number';
        }
        break;
      case 'confirmPassword':
        if (!current.confirmPassword) next.confirmPassword = 'Please confirm your password';
        else if (current.password !== current.confirmPassword) next.confirmPassword = 'Passwords do not match';
        break;
    }
    return next;
  }, []);

  // Blur handlers
  const createBlurHandler = useCallback((field: string) => {
    return () => {
      setTouched(prev => ({ ...prev, [field]: true }));
      const fieldErrors = validateField(field, formData);
      setErrors(prev => ({ ...prev, ...fieldErrors }));
    };
  }, [formData, validateField]);

  const handleNameBlur = createBlurHandler('name');
  const handleEmailBlur = createBlurHandler('email');
  const handlePasswordBlur = createBlurHandler('password');
  const handleConfirmPasswordBlur = createBlurHandler('confirmPassword');

  // Form-level validation
  const isFormValid = useCallback(() => {
    const hasAll = formData.name.trim() && formData.email.trim() && formData.password && formData.confirmPassword;
    const passwordsMatch = formData.password === formData.confirmPassword;
    const passwordValid = formData.password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password);
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    const consentValid = gdprConsent && privacyPolicyAccepted;
    return hasAll && passwordsMatch && passwordValid && emailValid && consentValid;
  }, [formData, gdprConsent, privacyPolicyAccepted]);

  const validateForm = () => {
    const fields = ['name', 'email', 'password', 'confirmPassword'] as const;
    const all: Record<string, string> = {};
    fields.forEach(f => Object.assign(all, validateField(f, formData)));
    if (!gdprConsent) all.gdprConsent = 'You must consent to data processing';
    if (!privacyPolicyAccepted) all.privacyPolicy = 'You must accept the privacy policy';
    setErrors(all);
    return Object.keys(all).length === 0;
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validateForm()) return;

    try {
      const result = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        gdprConsent,
        privacyPolicyAccepted,
        marketingConsent
      } as any);

      if ((result as any)?.success) {
        setLocalSuccess((result as any)?.message ?? 'Account created! You can sign in now.');
        if (onSwitchToLogin) setTimeout(() => onSwitchToLogin(), 2000);
      }
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  // Password strength
  const getPasswordStrength = useCallback(() => {
    const p = formData.password;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[a-z]/.test(p)) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }, [formData.password]);

  const getPasswordStrengthText = useCallback(() => {
    const s = getPasswordStrength();
    if (s < 2) return { text: 'Weak', color: 'text-red-600' };
    if (s < 4) return { text: 'Medium', color: 'text-yellow-600' };
    return { text: 'Strong', color: 'text-green-600' };
  }, [getPasswordStrength]);

  const togglePassword = useCallback(() => setShowPassword(v => !v), []);
  const toggleConfirmPassword = useCallback(() => setShowConfirmPassword(v => !v), []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="bg-muted w-full max-w-md rounded-lg shadow-xl">
        {/* Header */}
        <div className="border-border border-b px-6 py-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-fg mt-4 text-2xl font-bold">Join FundRaisely</h2>
            <p className="text-fg/70 mt-2 text-sm">
              Register your club and start fundraising today
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-6">
          {/* Success */}
          {localSuccess && (
            <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-800">{localSuccess}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <InputField
              label="Club Name"
              name="name"
              icon={Users}
              placeholder="e.g., Greenfield Community Club"
              autoComplete="organization"
              value={formData.name}
              onChange={handleInputChange}
              onBlur={handleNameBlur}
              error={errors.name}
              touched={touched.name}
              disabled={isLoading}
            />

            <InputField
              label="Email Address"
              name="email"
              type="email"
              icon={Mail}
              placeholder="club@example.com"
              autoComplete="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleEmailBlur}
              error={errors.email}
              touched={touched.email}
              disabled={isLoading}
            />

            <div>
              <InputField
                label="Password"
                name="password"
                icon={Lock}
                placeholder="Create a strong password"
                autoComplete="new-password"
                showToggle
                showPassword={showPassword}
                onToggleShow={togglePassword}
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handlePasswordBlur}
                error={errors.password}
                touched={touched.password}
                disabled={isLoading}
              />

              {formData.password && (
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-fg/60 text-xs">Password strength:</span>
                    <span className={`text-xs font-medium ${getPasswordStrengthText().color}`}>
                      {getPasswordStrengthText().text}
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-1 rounded-full transition-all duration-300 ${
                        getPasswordStrength() < 2 ? 'bg-red-500' :
                        getPasswordStrength() < 4 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(getPasswordStrength() / 5) * 100}%` }}
                    />
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
              showToggle
              showPassword={showConfirmPassword}
              onToggleShow={toggleConfirmPassword}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onBlur={handleConfirmPasswordBlur}
              error={errors.confirmPassword}
              touched={touched.confirmPassword}
              disabled={isLoading}
            />

            {/* Privacy & Consent */}
            <div className="border-border space-y-4 border-t pt-4">
              <h3 className="text-fg text-sm font-medium">Privacy & Consent</h3>

              <GDPRCheckbox
                id="gdpr-consent"
                checked={gdprConsent}
                onChange={handleGdprConsentChange}
                required
                error={errors.gdprConsent}
              >
                I consent to the processing of my personal data (name, email, and club information)
                for the purpose of creating and managing my FundRaisely account.
              </GDPRCheckbox>

              <GDPRCheckbox
                id="privacy-policy"
                checked={privacyPolicyAccepted}
                onChange={handlePrivacyPolicyChange}
                required
                error={errors.privacyPolicy}
              >
                I have read and agree to the{' '}
                <a href="/privacy-policy" target="_blank" className="text-blue-600 underline hover:text-blue-700">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="/terms" target="_blank" className="text-blue-600 underline hover:text-blue-700">
                  Terms of Service
                </a>
                .
              </GDPRCheckbox>

              <GDPRCheckbox
                id="marketing-consent"
                checked={marketingConsent}
                onChange={setMarketingConsent}
              >
                I would like to receive updates about new features, fundraising tips, and
                promotional content via email. You can unsubscribe at any time.
              </GDPRCheckbox>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Creating Account...
                </div>
              ) : (
                <div className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create Club Account
                </div>
              )}
            </button>
          </form>

          {/* Benefits */}
          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <h3 className="text-fg mb-2 text-sm font-medium">What you get:</h3>
            <ul className="text-fg/70 space-y-1 text-sm">
              <li className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                Track campaigns and events
              </li>
              <li className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                Manage supporters and volunteers
              </li>
              <li className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                Real-time fundraising insights
              </li>
              <li className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                Easy prize and task management
              </li>
            </ul>
          </div>

          {/* Login link */}
          {onSwitchToLogin && (
            <div className="mt-6 text-center">
              <p className="text-fg/70 text-sm">
                Already have an account?{' '}
                <button type="button" onClick={onSwitchToLogin} className="font-medium text-blue-600 hover:text-blue-500">
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
