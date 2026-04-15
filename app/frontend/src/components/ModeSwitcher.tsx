import { useState, createContext, useContext, ReactNode, useCallback } from 'react';
import { Compass, Briefcase, MapPinned, ChevronDown } from 'lucide-react';

type AppMode = 'traveler' | 'provider' | 'mentor';

interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isProvider: boolean;
  isTraveler: boolean;
  isMentor: boolean;
}

const ModeContext = createContext<ModeContextType | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('roamricher_mode');
    if (saved === 'traveler' || saved === 'provider' || saved === 'mentor') return saved;
    return 'traveler';
  });

  const handleSetMode = useCallback((newMode: AppMode) => {
    setMode(newMode);
    localStorage.setItem('roamricher_mode', newMode);
    // Fire-and-forget server sync (don't block UI)
    const token = localStorage.getItem('roamricher_token');
    if (token) {
      fetch('/api/users/switch-role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newMode }),
      }).catch(() => { /* silent */ });
    }
  }, []);

  return (
    <ModeContext.Provider
      value={{
        mode,
        setMode: handleSetMode,
        isProvider: mode === 'provider',
        isTraveler: mode === 'traveler',
        isMentor: mode === 'mentor',
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within ModeProvider');
  }
  return context;
}

// Mode switcher dropdown for header
export function ModeSwitcher() {
  const { mode, setMode } = useMode();
  const [isOpen, setIsOpen] = useState(false);

  const modes = [
    {
      value: 'traveler' as const,
      label: 'Traveler',
      description: 'Find & execute trips',
      icon: Compass,
      color: 'text-primary-600',
      bg: 'bg-primary-500/10',
    },
    {
      value: 'mentor' as const,
      label: 'Mentor',
      description: 'Draw & share routes',
      icon: MapPinned,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      value: 'provider' as const,
      label: 'Provider',
      description: 'Create & manage services',
      icon: Briefcase,
      color: 'text-primary-600',
      bg: 'bg-primary-500/10',
    },
  ];

  const currentMode = modes.find((m) => m.value === mode)!;
  const CurrentIcon = currentMode.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${currentMode.bg} ${currentMode.color} transition-colors hover:opacity-80`}
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="font-medium text-sm hidden sm:inline">{currentMode.label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-surface-card rounded-xl shadow-lg border border-line py-2 z-50">
            <div className="px-3 py-2 border-b border-line-light">
              <p className="text-xs font-medium text-content-muted uppercase tracking-wide">
                Switch Mode
              </p>
            </div>
            {modes.map((m) => {
              const Icon = m.icon;
              const isActive = mode === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => {
                    setMode(m.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-3 flex items-start gap-3 hover:bg-surface-hover transition-colors ${
                    isActive ? 'bg-surface-hover' : ''
                  }`}
                >
                  <div className={`p-2 rounded-lg ${m.bg}`}>
                    <Icon className={`h-4 w-4 ${m.color}`} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-content-heading flex items-center gap-2">
                      {m.label}
                      {isActive && (
                        <span className="text-xs text-primary-600 bg-primary-500/10 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-content-muted">{m.description}</div>
                  </div>
                </button>
              );
            })}
            <div className="px-3 py-2 border-t border-line-light mt-1">
              <p className="text-xs text-content-faint">
                {mode === 'traveler'
                  ? 'Switch to Provider to create routes'
                  : 'Switch to Traveler to book trips'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
