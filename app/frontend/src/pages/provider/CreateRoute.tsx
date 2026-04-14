import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Check, MapPin, Plus, X,
  DollarSign, Image, FileText, Sparkles,
  Trash2, Search, Info
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface RouteStop {
  id: string;
  day: number;
  name: string;
  description: string;
  duration: string;
  type: 'destination' | 'activity' | 'transport' | 'accommodation';
  entityId?: string;
}

interface RouteData {
  title: string;
  description: string;
  countryCode: string;
  countryName: string;
  totalDays: number;
  difficulty: 'easy' | 'moderate' | 'challenging';
  price: number;
  currency: string;
  includes: string[];
  excludes: string[];
  highlights: string[];
  stops: RouteStop[];
  coverImage: string;
  status: 'draft' | 'active';
}

// ============================================
// CONSTANTS
// ============================================
const STEPS = [
  { id: 'basics', label: 'Basics', icon: FileText },
  { id: 'itinerary', label: 'Itinerary', icon: MapPin },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'review', label: 'Review', icon: Check },
];

const COUNTRIES = [
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy', icon: '🌴', description: 'Minimal physical activity' },
  { value: 'moderate', label: 'Moderate', icon: '🚶', description: 'Some walking/hiking' },
  { value: 'challenging', label: 'Challenging', icon: '🏔️', description: 'Strenuous activities' },
] as const;

const STOP_TYPES = [
  { value: 'destination', label: 'Destination', icon: '📍' },
  { value: 'activity', label: 'Activity', icon: '🎯' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'accommodation', label: 'Stay', icon: '🏨' },
];

const COMMON_INCLUDES = [
  'Accommodation',
  'Breakfast',
  'Airport pickup',
  'Local guide',
  'Transportation',
  'Entry fees',
  'Water & snacks',
];

const COMMON_EXCLUDES = [
  'International flights',
  'Travel insurance',
  'Personal expenses',
  'Gratuities',
  'Lunch & dinner',
  'Visa fees',
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function CreateRoute() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [data, setData] = useState<RouteData>({
    title: '',
    description: '',
    countryCode: '',
    countryName: '',
    totalDays: 5,
    difficulty: 'moderate',
    price: 0,
    currency: 'USD',
    includes: [],
    excludes: [],
    highlights: [],
    stops: [],
    coverImage: '',
    status: 'draft',
  });

  const updateData = (updates: Partial<RouteData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const createRouteMutation = useMutation({
    mutationFn: async (_routeData: RouteData) => {
      // Would call API
      await new Promise(r => setTimeout(r, 1000));
      return { routeId: 'new-route-id' };
    },
    onSuccess: () => {
      navigate('/provider/routes');
    },
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (asDraft: boolean) => {
    setIsSubmitting(true);
    try {
      await createRouteMutation.mutateAsync({
        ...data,
        status: asDraft ? 'draft' : 'active',
      });
    } catch (error) {
      console.error('Failed to create route:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return data.title && data.countryCode && data.description;
      case 1: return data.stops.length > 0;
      case 2: return data.price > 0;
      case 3: return true; // Media is optional
      case 4: return true;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/provider/routes')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Routes
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Route</h1>
          <p className="text-gray-500 mt-1">Design a unique travel experience for your customers</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      onClick={() => isCompleted && setCurrentStep(index)}
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isActive
                          ? 'bg-primary-500 text-white scale-110 shadow-lg'
                          : isCompleted
                          ? 'bg-green-500 text-white cursor-pointer'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-4 h-4 md:w-5 md:h-5" />}
                    </div>
                    <span className={`mt-2 text-xs font-medium hidden sm:block ${isActive ? 'text-primary-600' : 'text-gray-500'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${index < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[500px]">
          {currentStep === 0 && <BasicsStep data={data} onUpdate={updateData} />}
          {currentStep === 1 && <ItineraryStep data={data} onUpdate={updateData} />}
          {currentStep === 2 && <PricingStep data={data} onUpdate={updateData} />}
          {currentStep === 3 && <MediaStep data={data} onUpdate={updateData} />}
          {currentStep === 4 && <ReviewStep data={data} onSubmit={handleSubmit} isSubmitting={isSubmitting} />}

          {/* Navigation */}
          {currentStep < 4 && (
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>

              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all ${
                  canProceed()
                    ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// STEP COMPONENTS
// ============================================

function BasicsStep({ data, onUpdate }: { data: RouteData; onUpdate: (d: Partial<RouteData>) => void }) {
  const [countrySearch, setCountrySearch] = useState('');
  const [newHighlight, setNewHighlight] = useState('');

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return COUNTRIES;
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()));
  }, [countrySearch]);

  const addHighlight = () => {
    if (newHighlight.trim() && !data.highlights.includes(newHighlight.trim())) {
      onUpdate({ highlights: [...data.highlights, newHighlight.trim()] });
      setNewHighlight('');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Route Basics</h2>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Route Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="e.g., Cultural Triangle 7 Days"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Country */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Country <span className="text-red-500">*</span>
        </label>
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
            placeholder="Search countries..."
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
          {filteredCountries.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => onUpdate({ countryCode: country.code, countryName: country.name })}
              className={`p-2 rounded-lg border-2 text-left transition-all text-sm ${
                data.countryCode === country.code
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="mr-1">{country.flag}</span>
              {country.name}
            </button>
          ))}
        </div>
      </div>

      {/* Duration & Difficulty */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (days) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={data.totalDays}
            onChange={(e) => onUpdate({ totalDays: parseInt(e.target.value) || 1 })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onUpdate({ difficulty: option.value })}
                className={`flex-1 p-2 rounded-lg border-2 text-center transition-all ${
                  data.difficulty === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{option.icon}</span>
                <div className="text-xs font-medium mt-1">{option.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Describe what makes this route special..."
          rows={4}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      {/* Highlights */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Highlights</label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newHighlight}
            onChange={(e) => setNewHighlight(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
            placeholder="e.g., Visit ancient temples"
            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={addHighlight}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.highlights.map((h, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
              ✨ {h}
              <button onClick={() => onUpdate({ highlights: data.highlights.filter((_, idx) => idx !== i) })}>
                <X className="h-4 w-4" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ItineraryStep({ data, onUpdate }: { data: RouteData; onUpdate: (d: Partial<RouteData>) => void }) {
  const [editingStop, setEditingStop] = useState<Partial<RouteStop> | null>(null);

  const addStop = () => {
    if (!editingStop?.name) return;
    const newStop: RouteStop = {
      id: `stop-${Date.now()}`,
      day: editingStop.day || 1,
      name: editingStop.name,
      description: editingStop.description || '',
      duration: editingStop.duration || '2 hours',
      type: editingStop.type || 'destination',
    };
    onUpdate({ stops: [...data.stops, newStop] });
    setEditingStop(null);
  };

  const removeStop = (id: string) => {
    onUpdate({ stops: data.stops.filter(s => s.id !== id) });
  };

  const stopsByDay = useMemo(() => {
    const grouped: Record<number, RouteStop[]> = {};
    data.stops.forEach(stop => {
      if (!grouped[stop.day]) grouped[stop.day] = [];
      grouped[stop.day].push(stop);
    });
    return grouped;
  }, [data.stops]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Build Itinerary</h2>
        <button
          onClick={() => setEditingStop({ day: 1, type: 'destination' })}
          className="bg-primary-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Stop
        </button>
      </div>

      {/* Add/Edit Stop Form */}
      {editingStop && (
        <div className="bg-gray-50 rounded-xl p-4 border-2 border-dashed border-gray-300">
          <h3 className="font-semibold mb-4">Add New Stop</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
              <select
                value={editingStop.day || 1}
                onChange={(e) => setEditingStop({ ...editingStop, day: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {Array.from({ length: data.totalDays }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>Day {day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={editingStop.type || 'destination'}
                onChange={(e) => setEditingStop({ ...editingStop, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {STOP_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editingStop.name || ''}
                onChange={(e) => setEditingStop({ ...editingStop, name: e.target.value })}
                placeholder="e.g., Sigiriya Rock Fortress"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={editingStop.description || ''}
                onChange={(e) => setEditingStop({ ...editingStop, description: e.target.value })}
                placeholder="Brief description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <input
                type="text"
                value={editingStop.duration || ''}
                onChange={(e) => setEditingStop({ ...editingStop, duration: e.target.value })}
                placeholder="e.g., 3 hours"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={addStop}
              disabled={!editingStop.name}
              className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              Add Stop
            </button>
            <button
              onClick={() => setEditingStop(null)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Itinerary by Day */}
      {data.stops.length > 0 ? (
        <div className="space-y-6">
          {Array.from({ length: data.totalDays }, (_, i) => i + 1).map(day => (
            <div key={day} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-900">Day {day}</h3>
              </div>
              <div className="p-4">
                {stopsByDay[day]?.length > 0 ? (
                  <div className="space-y-3">
                    {stopsByDay[day].map((stop) => (
                      <div key={stop.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-lg">
                          {STOP_TYPES.find(t => t.value === stop.type)?.icon || '📍'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{stop.name}</p>
                          {stop.description && <p className="text-sm text-gray-500">{stop.description}</p>}
                          <p className="text-xs text-gray-400 mt-1">{stop.duration}</p>
                        </div>
                        <button
                          onClick={() => removeStop(stop.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No stops planned for this day</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No stops yet</h3>
          <p className="text-gray-500 mb-4">Add destinations and activities for each day</p>
        </div>
      )}
    </div>
  );
}

function PricingStep({ data, onUpdate }: { data: RouteData; onUpdate: (d: Partial<RouteData>) => void }) {
  const toggleInclude = (item: string) => {
    const includes = data.includes.includes(item)
      ? data.includes.filter(i => i !== item)
      : [...data.includes, item];
    onUpdate({ includes });
  };

  const toggleExclude = (item: string) => {
    const excludes = data.excludes.includes(item)
      ? data.excludes.filter(i => i !== item)
      : [...data.excludes, item];
    onUpdate({ excludes });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Pricing & Inclusions</h2>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Price per Person <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="number"
              min={0}
              value={data.price || ''}
              onChange={(e) => onUpdate({ price: parseInt(e.target.value) || 0 })}
              placeholder="0"
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-2xl font-bold"
            />
          </div>
          <select
            value={data.currency}
            onChange={(e) => onUpdate({ currency: e.target.value })}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="LKR">LKR</option>
          </select>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Suggested: ${Math.round(data.totalDays * 50)}-${Math.round(data.totalDays * 150)} for a {data.totalDays}-day trip
        </p>
      </div>

      {/* What's Included */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">What's Included</label>
        <div className="flex flex-wrap gap-2">
          {COMMON_INCLUDES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleInclude(item)}
              className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                data.includes.includes(item)
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              {data.includes.includes(item) && <Check className="h-4 w-4 inline mr-1" />}
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* What's Not Included */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Not Included</label>
        <div className="flex flex-wrap gap-2">
          {COMMON_EXCLUDES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleExclude(item)}
              className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                data.excludes.includes(item)
                  ? 'border-red-500 bg-red-500 text-white'
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              {data.excludes.includes(item) && <X className="h-4 w-4 inline mr-1" />}
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Pricing Tips</p>
            <p className="text-sm text-blue-700">
              Competitive pricing attracts more bookings. Consider what's included when setting your price.
              You can adjust pricing later based on demand.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaStep({ data, onUpdate }: { data: RouteData; onUpdate: (d: Partial<RouteData>) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Photos & Media</h2>

      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image URL</label>
        <input
          type="url"
          value={data.coverImage}
          onChange={(e) => onUpdate({ coverImage: e.target.value })}
          placeholder="https://example.com/image.jpg"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
        />
        {data.coverImage && (
          <div className="mt-4 relative aspect-video rounded-xl overflow-hidden bg-gray-100">
            <img
              src={data.coverImage}
              alt="Cover"
              className="w-full h-full object-cover"
              onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/800x400?text=Invalid+URL')}
            />
          </div>
        )}
      </div>

      {/* Upload zone (placeholder for now) */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
        <Image className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="font-semibold text-gray-900 mb-2">Upload Photos</h3>
        <p className="text-gray-500 text-sm mb-4">Drag and drop images or click to browse</p>
        <button className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium">
          Browse Files
        </button>
        <p className="text-xs text-gray-400 mt-4">Maximum 10 images, 5MB each. JPG, PNG, or WebP.</p>
      </div>
    </div>
  );
}

function ReviewStep({ data, onSubmit, isSubmitting }: { data: RouteData; onSubmit: (asDraft: boolean) => void; isSubmitting: boolean }) {
  const countryFlag = COUNTRIES.find(c => c.code === data.countryCode)?.flag || '🌍';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Review & Publish</h2>

      {/* Summary Card */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex items-start gap-4">
          {data.coverImage ? (
            <img src={data.coverImage} alt="" className="w-24 h-24 object-cover rounded-lg" />
          ) : (
            <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
              <Image className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{data.title || 'Untitled Route'}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <span>{countryFlag} {data.countryName}</span>
              <span>•</span>
              <span>{data.totalDays} days</span>
              <span>•</span>
              <span className="capitalize">{data.difficulty}</span>
            </div>
            <p className="text-gray-600 mt-2 line-clamp-2">{data.description}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary-600">${data.price}</p>
            <p className="text-sm text-gray-500">per person</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{data.stops.length}</p>
          <p className="text-sm text-gray-500">Stops</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{data.highlights.length}</p>
          <p className="text-sm text-gray-500">Highlights</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{data.includes.length}</p>
          <p className="text-sm text-gray-500">Inclusions</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{data.totalDays}</p>
          <p className="text-sm text-gray-500">Days</p>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="font-semibold mb-3">Publishing Checklist</h4>
        <div className="space-y-2">
          {[
            { ok: !!data.title, text: 'Route title added' },
            { ok: !!data.description, text: 'Description written' },
            { ok: data.stops.length >= 3, text: 'At least 3 stops added' },
            { ok: data.price > 0, text: 'Price set' },
            { ok: data.includes.length > 0, text: 'Inclusions specified' },
            { ok: !!data.coverImage, text: 'Cover image added' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {item.ok ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <X className="h-5 w-5 text-gray-300" />
              )}
              <span className={item.ok ? 'text-gray-700' : 'text-gray-400'}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          onClick={() => onSubmit(true)}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700"
        >
          Save as Draft
        </button>
        <button
          onClick={() => onSubmit(false)}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Publish Route
            </>
          )}
        </button>
      </div>
    </div>
  );
}
