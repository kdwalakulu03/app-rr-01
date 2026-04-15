import { Check } from 'lucide-react';
import { TRANSPORT_OPTIONS, StepProps } from './types';

export default function TransportStep({ data, onUpdate }: StepProps) {
  const toggleTransport = (value: string) => {
    const newModes = data.transportModes.includes(value)
      ? data.transportModes.filter(m => m !== value)
      : [...data.transportModes, value];
    onUpdate({ transportModes: newModes });
  };

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">How do you like to travel?</h2>
      <p className="text-content-muted mb-6">Select your preferred transport modes (at least 1)</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {TRANSPORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleTransport(option.value)}
            className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
              data.transportModes.includes(option.value)
                ? 'border-primary-500 bg-primary-500/10 shadow-md'
                : 'border-line hover:border-content-faint'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl">{option.icon}</span>
              {data.transportModes.includes(option.value) && <Check className="w-5 h-5 text-primary-500" />}
            </div>
            <div className="mt-2">
              <div className="font-semibold text-content-heading">{option.label}</div>
              <div className="text-xs text-content-muted">{option.description}</div>
            </div>
          </button>
        ))}
      </div>

      {data.transportModes.length > 0 && (
        <div className="mt-6 p-4 bg-primary-500/10 rounded-xl">
          <p className="text-sm text-primary-600">
            <span className="font-medium">{data.transportModes.length} transport mode{data.transportModes.length > 1 ? 's' : ''} selected</span>
          </p>
        </div>
      )}
    </div>
  );
}
