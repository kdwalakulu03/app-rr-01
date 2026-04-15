import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Search } from 'lucide-react';
import { api } from '../../../lib/api';
import { StepProps, getCountryFlag } from './types';

interface CountryStepProps extends StepProps {
  isLocked: boolean;
}

export default function CountryStep({ data, onUpdate, isLocked }: CountryStepProps) {
  const [search, setSearch] = useState('');

  const { data: countriesData, isLoading } = useQuery({
    queryKey: ['countriesWithPlaces'],
    queryFn: () => api.getCountriesWithPlaces(),
  });

  const countries = countriesData?.countries || [];

  const filteredCountries = useMemo(() => {
    if (!search) return countries;
    return countries.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [search, countries]);

  if (isLocked && data.country) {
    return (
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Destination ✨</h2>
        <p className="text-content-muted mb-6">Pre-selected from your chosen route</p>

        <div className="p-5 bg-primary-500/10 border-2 border-primary-500 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{getCountryFlag(data.countryCode)}</span>
            <div>
              <span className="font-bold text-primary-600 text-2xl">{data.country}</span>
              <p className="text-primary-600 text-sm">From your selected route</p>
            </div>
          </div>
          <Check className="w-8 h-8 text-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-content-heading mb-2">Where do you want to go?</h2>
      <p className="text-content-muted mb-6">Select your destination country</p>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-content-faint" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search countries..."
          className="w-full pl-12 pr-4 py-3 border-2 border-line rounded-xl focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {data.country && (
        <div className="mb-4 p-4 bg-primary-500/10 border-2 border-primary-500 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getCountryFlag(data.countryCode)}</span>
            <span className="font-semibold text-primary-600">{data.country}</span>
          </div>
          <Check className="w-6 h-6 text-primary-500" />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
          {filteredCountries.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => onUpdate({ country: country.name, countryCode: country.code, cities: [] })}
              className={`p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                data.countryCode === country.code
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-line hover:border-content-faint'
              }`}
            >
              <span className="text-2xl mr-2">{country.flag || getCountryFlag(country.code)}</span>
              <span className="font-medium text-content-heading">{country.name}</span>
              {country.placeCount > 0 && (
                <span className="block text-xs text-content-faint ml-9">{country.placeCount.toLocaleString()} places</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
