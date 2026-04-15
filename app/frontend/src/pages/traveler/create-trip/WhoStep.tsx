import { GROUP_OPTIONS, StepProps } from './types';

export default function WhoStep({ data, onUpdate }: StepProps) {
  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Who's traveling?</h2>
      <p className="text-content-muted mb-6">Tell us about your travel group</p>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
        {GROUP_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onUpdate({ groupType: option.value, travelers: option.defaultTravelers })}
            className={`p-4 md:p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
              data.groupType === option.value
                ? 'border-primary-500 bg-primary-500/10 shadow-lg'
                : 'border-line hover:border-content-faint hover:shadow-md'
            }`}
          >
            <div className="text-3xl md:text-4xl mb-2">{option.icon}</div>
            <div className="font-bold text-content-heading">{option.label}</div>
            <div className="text-sm text-content-muted">{option.description}</div>
          </button>
        ))}
      </div>

      {data.groupType === 'family' && (
        <div className="space-y-4 p-4 bg-surface rounded-xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content mb-2">Adults (18+)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={data.adults}
                onChange={(e) => onUpdate({ adults: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-3 rounded-lg border border-line focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content mb-2">Children</label>
              <input
                type="number"
                min={0}
                max={10}
                value={data.kids}
                onChange={(e) => onUpdate({ kids: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-lg border border-line focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="p-3 bg-primary-500/15 rounded-lg text-center">
            <span className="text-content-muted">Total: </span>
            <span className="text-xl font-bold text-primary-600">{data.adults + data.kids} travelers</span>
          </div>
        </div>
      )}

      {data.groupType === 'group' && (
        <div className="p-4 bg-surface rounded-xl">
          <label className="block text-sm font-medium text-content mb-2">Number of travelers</label>
          <input
            type="number"
            min={3}
            max={20}
            value={data.travelers}
            onChange={(e) => onUpdate({ travelers: parseInt(e.target.value) || 3 })}
            className="w-full px-4 py-3 rounded-lg border border-line focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}
    </div>
  );
}
