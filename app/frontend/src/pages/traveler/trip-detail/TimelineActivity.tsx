// ─── TimelineActivity — single activity in the day timeline ───
import { useState } from 'react';
import {
  Clock, DollarSign, Check, X, Edit3, Trash2, GripVertical, Navigation,
} from 'lucide-react';
import type { TripActivity } from '../../../lib/api';
import { CATEGORY_META, DEFAULT_META, haversineMeters } from './constants';
import Button from '../../../components/ui/Button';

interface TimelineActivityProps {
  activity: TripActivity;
  index: number;
  isLast: boolean;
  prevActivity: TripActivity | null;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export default function TimelineActivity({
  activity,
  index,
  isLast,
  prevActivity,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onDragStart,
  onDrop,
}: TimelineActivityProps) {
  const [editName, setEditName] = useState(activity.name);
  const [editNotes, setEditNotes] = useState(activity.notes || '');
  const [editTime, setEditTime] = useState(activity.plannedStartTime || '');
  const meta = CATEGORY_META[activity.category || ''] || DEFAULT_META;

  // Calculate travel from previous activity
  let travelMinutes = 0;
  if (prevActivity && prevActivity.latitude && prevActivity.longitude && activity.latitude && activity.longitude) {
    const dist = haversineMeters(prevActivity.latitude, prevActivity.longitude, activity.latitude, activity.longitude);
    travelMinutes = Math.max(3, Math.round(dist / 6 / 60)); // ~22 km/h avg
  }

  const isCompleted = activity.status === 'completed';
  const isSkipped = activity.status === 'skipped';

  return (
    <div>
      {/* Travel connector */}
      {index > 0 && (
        <div className="flex items-center ml-6 py-1">
          <div className="w-0.5 h-4 bg-surface-subtle ml-[11px]" />
          {travelMinutes > 0 && (
            <div className="ml-4 flex items-center gap-1 text-xs text-content-faint">
              <Navigation className="h-3 w-3" />
              <span>~{travelMinutes} min travel</span>
            </div>
          )}
        </div>
      )}

      {/* Activity card */}
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`group relative flex gap-3 ${
          isCompleted ? 'opacity-60' : isSkipped ? 'opacity-40' : ''
        }`}
      >
        {/* Timeline dot + line */}
        <div className="flex flex-col items-center pt-4">
          {/* Time */}
          <div className="text-xs font-medium text-content-faint mb-1 w-12 text-right">
            {activity.plannedStartTime || ''}
          </div>
          {/* Dot */}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            isCompleted ? 'bg-primary-500/15' : isSkipped ? 'bg-surface-subtle' : meta.bg
          }`}>
            {isCompleted ? (
              <Check className="h-3.5 w-3.5 text-primary-500" />
            ) : isSkipped ? (
              <X className="h-3.5 w-3.5 text-content-faint" />
            ) : (
              <span className={meta.color}>{meta.icon}</span>
            )}
          </div>
          {/* Line down */}
          {!isLast && <div className="w-0.5 flex-1 bg-surface-subtle mt-1" />}
        </div>

        {/* Card */}
        <div className="flex-1 pb-4">
          {isEditing ? (
            /* Edit mode */
            <div className="bg-surface-card rounded-xl shadow-md border-2 border-primary-500/40 p-4">
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-card text-content font-medium"
                  placeholder="Activity name"
                  autoFocus
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-24 px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
                    placeholder="09:00"
                  />
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="flex-1 px-3 py-2 border border-line rounded-lg bg-surface-card text-content text-sm"
                    placeholder="Notes..."
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm" onClick={onCancelEdit}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={() => onSaveEdit({
                      name: editName,
                      notes: editNotes || undefined,
                      plannedStartTime: editTime || undefined,
                    })}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* View mode */
            <div className="bg-surface-card rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 cursor-grab active:cursor-grabbing">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-content-heading truncate">{activity.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-sm text-content-muted line-clamp-2 mb-1">{activity.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-content-faint">
                    {activity.plannedDurationMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {activity.plannedDurationMinutes} min
                      </span>
                    )}
                    {activity.estimatedCost && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> ~${activity.estimatedCost}
                      </span>
                    )}
                    {activity.notes && (
                      <span className="italic truncate max-w-[150px]">{activity.notes}</span>
                    )}
                  </div>
                </div>

                {/* Action buttons (visible on hover) */}
                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button onClick={onEdit} className="p-1.5 hover:bg-surface-hover rounded-lg text-content-muted hover:text-content">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={onDelete} className="p-1.5 hover:bg-red-500/10 rounded-lg text-content-muted hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <GripVertical className="h-4 w-4 text-content-muted" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
