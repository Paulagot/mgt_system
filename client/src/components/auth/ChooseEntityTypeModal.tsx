// client/src/components/auth/ChooseEntityTypeModal.tsx
import React, { useMemo } from 'react';
import {
  X,
  Users,
  GraduationCap,
  HeartHandshake,
  User,
  ArrowRight,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export type EntityType = 'club' | 'school' | 'charity' | 'cause';

interface ChooseEntityTypeModalProps {
  isOpen: boolean;
  selected?: EntityType | null;
  onSelect: (type: EntityType) => void;

  /** Called when user clicks Continue (you handle saving to backend outside) */
  onContinue: () => void;

  onClose: () => void;

  /** Optional UI states */
  isSaving?: boolean;
  error?: string | null;
  /** If true, shows a small “You can change later” hint (default true) */
  showChangeLaterHint?: boolean;
}

export default function ChooseEntityTypeModal({
  isOpen,
  selected = null,
  onSelect,
  onContinue,
  onClose,
  isSaving = false,
  error = null,
  showChangeLaterHint = true,
}: ChooseEntityTypeModalProps) {
  const options = useMemo(
    () =>
      [
        {
          id: 'club' as const,
          label: 'Club / Community Group',
          icon: Users,
          description: 'Sports clubs, societies, and local community groups.',
          examples: 'GAA club • running club • residents association',
        },
        {
          id: 'school' as const,
          label: 'School',
          icon: GraduationCap,
          description: 'Primary/secondary schools, PTAs, and school groups.',
          examples: 'PTA fundraiser • school trip • classroom resources',
        },
        {
          id: 'charity' as const,
          label: 'Registered Charity',
          icon: HeartHandshake,
          description: 'Charities and non-profits raising for a mission.',
          examples: 'local charity • NGO • national charity',
        },
        {
          id: 'cause' as const,
          label: 'Personal Cause',
          icon: User,
          description: 'Peer-to-peer fundraising for an individual or family.',
          examples: 'medical fund • memorial • hardship support',
        },
      ] as const,
    []
  );

  if (!isOpen) return null;

  const canContinue = Boolean(selected) && !isSaving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-500/75"
        onClick={() => {
          if (!isSaving) onClose();
        }}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Set up your organisation</h2>
              <p className="text-sm text-gray-600 mt-1">
                Before you create a campaign, tell us what type you are. This helps with public pages and impact reporting.
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isSaving}
              aria-label="Close"
              title="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Error */}
          {error ? (
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Couldn&apos;t save your organisation type</p>
                <p className="text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          ) : null}

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selected === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isSaving}
                  onClick={() => onSelect(opt.id)}
                  className={[
                    'text-left rounded-lg border p-4 transition shadow-sm',
                    isSelected
                      ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200'
                      : 'border-gray-200 bg-white hover:bg-gray-50',
                    isSaving ? 'opacity-60 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        'p-2 rounded-lg',
                        isSelected ? 'bg-indigo-100' : 'bg-gray-100',
                      ].join(' ')}
                    >
                      <Icon className={['h-6 w-6', isSelected ? 'text-indigo-700' : 'text-gray-700'].join(' ')} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{opt.label}</h3>
                        {isSelected ? (
                          <span className="text-xs font-medium text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full">
                            Selected
                          </span>
                        ) : null}
                      </div>

                      <p className="text-sm text-gray-700 mt-1">{opt.description}</p>
                      <p className="text-xs text-gray-500 mt-2">{opt.examples}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Not sure? */}
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <HelpCircle className="h-4 w-4 mt-0.5 text-gray-400" />
            <div>
              <span className="font-medium">Not sure?</span>{' '}
              Pick the closest match — you can change this later.
            </div>
          </div>

          {showChangeLaterHint ? (
            <div className="text-xs text-gray-500">
              This is just to set defaults (impact areas, public pages, and reporting). You can update it later in settings.
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
