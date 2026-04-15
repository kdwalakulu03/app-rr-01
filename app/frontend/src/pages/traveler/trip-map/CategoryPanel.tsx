import { MapPin, X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { CATEGORY_CONFIG } from './constants';

interface CategoryItem {
  key: string;
  count: number;
}

interface Props {
  categories: CategoryItem[];
  enabledCategories: Set<string>;
  categoryKeys: string[];
  placesQueries: { isLoading: boolean }[];
  onToggle: (cat: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export default function CategoryPanel({
  categories, enabledCategories, categoryKeys, placesQueries,
  onToggle, onClearAll, onClose,
}: Props) {
  return (
    <div className="absolute top-3 right-3 w-56 bg-surface-card/95 backdrop-blur-sm border border-line rounded-xl shadow-xl z-10 overflow-hidden">
      <div className="px-3 py-2 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-primary-500" />
          <span className="text-xs font-semibold text-content-heading">Places</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-surface-hover rounded text-content-muted">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-2 space-y-0.5 max-h-[50vh] overflow-y-auto">
        {categories.length === 0 ? (
          <p className="text-xs text-content-muted px-2 py-1">No places for this country</p>
        ) : (
          categories.map(({ key, count }) => {
            const cfg = CATEGORY_CONFIG[key];
            const isOn = enabledCategories.has(key);
            const query = placesQueries[categoryKeys.indexOf(key)];
            const isLoadingCat = query?.isLoading;
            return (
              <button
                key={key}
                onClick={() => onToggle(key)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isOn
                    ? 'bg-primary-500/10 text-content'
                    : 'text-content-muted hover:bg-surface-hover'
                }`}
              >
                <span className={`${isOn ? (cfg?.color || 'text-primary-400') : 'text-content-faint'}`}>
                  {cfg?.icon || <MapPin className="h-3.5 w-3.5" />}
                </span>
                <span className="flex-1 text-left font-medium">
                  {cfg?.label || key.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-content-faint">{count}</span>
                {isLoadingCat && <Loader2 className="h-3 w-3 animate-spin text-primary-500" />}
                {isOn ? (
                  <Eye className="h-3 w-3 text-primary-400" />
                ) : (
                  <EyeOff className="h-3 w-3 text-content-faint" />
                )}
              </button>
            );
          })
        )}
      </div>
      {enabledCategories.size > 0 && (
        <div className="px-3 py-1.5 border-t border-line">
          <button
            onClick={onClearAll}
            className="text-[10px] text-content-muted hover:text-content transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
