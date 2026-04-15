import { Sparkles } from 'lucide-react';
import { ACTIVITY_PREFERENCES, INTEREST_OPTIONS, StepProps } from './types';

export default function ActivitiesStep({ data, onUpdate }: StepProps) {
  const toggleActivity = (value: string) => {
    const newPrefs = data.activityPreferences.includes(value)
      ? data.activityPreferences.filter(p => p !== value)
      : [...data.activityPreferences, value];
    onUpdate({ activityPreferences: newPrefs });
  };

  const relevantCategories = data.interests
    .filter(interest => ACTIVITY_PREFERENCES[interest])
    .map(interest => ({ ...ACTIVITY_PREFERENCES[interest], interestValue: interest }));

  if (relevantCategories.length === 0) {
    return (
      <div className="text-center py-8">
        <Sparkles className="w-12 h-12 text-content-faint mx-auto mb-4" />
        <h3 className="text-lg font-medium text-content-heading mb-2">All set!</h3>
        <p className="text-content-muted">Click "Create Trip" to start your adventure.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Fine-tune your experiences</h2>
      <p className="text-content-muted mb-6">Select specific activities you'd love (optional)</p>

      <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2">
        {relevantCategories.map((category) => (
          <div key={category.interestValue} className="bg-surface rounded-xl p-4">
            <h3 className="font-semibold text-content-heading mb-3 flex items-center gap-2">
              <span>{INTEREST_OPTIONS.find(i => i.value === category.interestValue)?.icon}</span>
              {category.label}
            </h3>
            <div className="flex flex-wrap gap-2">
              {category.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleActivity(option.value)}
                  className={`px-3 py-2 rounded-lg border-2 font-medium transition-all flex items-center gap-2 text-sm ${
                    data.activityPreferences.includes(option.value)
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-line bg-surface-card hover:border-primary-500/30'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
        <p className="text-sm text-content-muted">
          <span className="font-medium">✨ Almost there!</span> These help us personalize your trip. You can skip if you prefer broader recommendations.
        </p>
      </div>
    </div>
  );
}
