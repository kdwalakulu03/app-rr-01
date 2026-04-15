import { PACE_OPTIONS, BUDGET_OPTIONS, INTEREST_OPTIONS, StepProps } from './types';

export default function StyleStep({ data, onUpdate }: StepProps) {
  const toggleInterest = (interest: string) => {
    const newInterests = data.interests.includes(interest)
      ? data.interests.filter(i => i !== interest)
      : [...data.interests, interest];
    onUpdate({ interests: newInterests });
  };

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Your travel style</h2>
      <p className="text-content-muted mb-6">Help us personalize your itinerary</p>

      {/* Pace */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-content mb-3">Travel pace</label>
        <div className="grid grid-cols-3 gap-3">
          {PACE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onUpdate({ pace: option.value })}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                data.pace === option.value ? 'border-primary-500 bg-primary-500/10' : 'border-line hover:border-content-faint'
              }`}
            >
              <div className="text-2xl mb-1">{option.icon}</div>
              <div className="font-semibold text-sm">{option.label}</div>
              <div className="text-xs text-content-muted">{option.subtitle}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-content mb-3">Budget level</label>
        <div className="grid grid-cols-3 gap-3">
          {BUDGET_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onUpdate({ budgetLevel: option.value })}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                data.budgetLevel === option.value ? 'border-primary-500 bg-primary-500/10' : 'border-line hover:border-content-faint'
              }`}
            >
              <div className="text-2xl mb-1">{option.icon}</div>
              <div className="font-semibold text-sm">{option.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="block text-sm font-medium text-content mb-3">What interests you? (select at least 1)</label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleInterest(option.value)}
              className={`px-4 py-2 rounded-full border-2 font-medium transition-all flex items-center gap-2 ${
                data.interests.includes(option.value)
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-line hover:border-primary-500/30 hover:bg-primary-500/5'
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
