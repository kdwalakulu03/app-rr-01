// ─── AutopilotView — AI-powered trip autopilot tab ───
import { useState } from 'react';
import {
  Sparkles, MapPin, Check, SkipForward, RefreshCw, Loader2,
} from 'lucide-react';
import type { Trip } from '../../../lib/api';
import Modal, { ModalFooter } from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';

interface AutopilotViewProps {
  trip: Trip;
  suggestion: any;
  loading: boolean;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onReplan: (reason: string) => void;
  onRefresh: () => void;
}

export default function AutopilotView({
  trip: _trip,
  suggestion,
  loading,
  onComplete,
  onSkip,
  onReplan,
  onRefresh,
}: AutopilotViewProps) {
  const [showReplanModal, setShowReplanModal] = useState(false);
  const [replanReason, setReplanReason] = useState('');

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-4" />
        <p className="text-content-muted">Loading suggestion...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">Next Up</span>
        </div>
        {suggestion ? (
          <>
            <h2 className="text-2xl font-bold mb-2">{suggestion.activity?.name}</h2>
            {suggestion.activity?.placeName && (
              <p className="text-white/80 mb-4 flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {suggestion.activity.placeName}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => onComplete(suggestion.activity.id)} className="flex-1 bg-surface-card text-primary-600 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                <Check className="h-5 w-5" /> Done
              </button>
              <button onClick={() => onSkip(suggestion.activity.id)} className="px-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl">
                <SkipForward className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <Check className="h-12 w-12 mx-auto mb-3 text-white/60" />
            <p className="text-lg font-medium">All done for today!</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={onRefresh} className="bg-surface-card p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-primary-500" /> <span className="font-medium">Refresh</span>
        </button>
        <button onClick={() => setShowReplanModal(true)} className="bg-surface-card p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-primary-500" /> <span className="font-medium">Replan Day</span>
        </button>
      </div>

      <Modal open={showReplanModal} onClose={() => setShowReplanModal(false)} title="Replan Today" maxWidth="max-w-md">
        <div className="space-y-2 mb-4">
          {['Tired / want to rest', 'Weather is bad', 'Found something better', 'Running late'].map((reason) => (
            <button key={reason} onClick={() => setReplanReason(reason)} className={`w-full p-3 rounded-lg border text-left ${replanReason === reason ? 'border-primary-500 bg-primary-500/10' : 'border-line'}`}>
              {reason}
            </button>
          ))}
        </div>
        <input type="text" value={replanReason} onChange={(e) => setReplanReason(e.target.value)} placeholder="Or type your reason..." className="w-full px-4 py-2.5 border border-line rounded-lg bg-surface-card text-content" />
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowReplanModal(false)} className="flex-1">Cancel</Button>
          <Button onClick={() => { onReplan(replanReason); setShowReplanModal(false); }} disabled={!replanReason} className="flex-1">Replan</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
