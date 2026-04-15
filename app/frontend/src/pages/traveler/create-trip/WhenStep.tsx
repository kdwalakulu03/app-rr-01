import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { StepProps } from './types';

interface WhenStepProps extends StepProps {
  routeDays?: number;
}

export default function WhenStep({ data, onUpdate, routeDays }: WhenStepProps) {
  const today = new Date().toISOString().split('T')[0];

  // Auto-calculate end date if route has fixed days
  const endDate = useMemo(() => {
    if (routeDays && data.startDate) {
      const start = new Date(data.startDate);
      start.setDate(start.getDate() + routeDays - 1);
      return start.toISOString().split('T')[0];
    }
    return data.endDate;
  }, [data.startDate, routeDays, data.endDate]);

  const duration = data.startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : routeDays || 0;

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">When are you going?</h2>
      <p className="text-content-muted mb-6">Select your travel dates</p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content mb-2">Start Date</label>
            <input
              type="date"
              value={data.startDate}
              min={today}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
              className="w-full px-4 py-3 border-2 border-line rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              min={data.startDate || today}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
              disabled={!!routeDays}
              className="w-full px-4 py-3 border-2 border-line rounded-xl focus:ring-2 focus:ring-primary-500 disabled:bg-surface"
            />
          </div>
        </div>

        {duration > 0 && (
          <div className="p-4 bg-primary-500/10 rounded-xl text-center">
            <span className="text-content-muted">Trip duration: </span>
            <span className="text-2xl font-bold text-primary-600">{duration} {duration === 1 ? 'day' : 'days'}</span>
          </div>
        )}

        {routeDays && (
          <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-sm text-content-muted">
            <Sparkles className="h-4 w-4 inline mr-1" />
            This route is designed for {routeDays} days. End date is automatically calculated.
          </div>
        )}

        <label className="flex items-center gap-3 p-4 bg-surface rounded-xl cursor-pointer hover:bg-surface-hover transition-colors">
          <input
            type="checkbox"
            checked={data.flexible}
            onChange={(e) => onUpdate({ flexible: e.target.checked })}
            className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
          />
          <div>
            <span className="font-medium text-content-heading">My dates are flexible</span>
            <p className="text-sm text-content-muted">We'll suggest the best times to visit</p>
          </div>
        </label>
      </div>
    </div>
  );
}
