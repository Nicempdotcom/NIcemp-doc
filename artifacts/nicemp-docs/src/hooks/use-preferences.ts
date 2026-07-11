import { useEffect, useState } from 'react';
import { PreferencesRepository, type Preferences } from '@/services/storage/PreferencesRepository';

/** Live-reflects PreferencesRepository state, re-rendering on any change made in this tab. */
export function usePreferences(): Preferences {
  const [prefs, setPrefs] = useState<Preferences>(() => PreferencesRepository.get());
  useEffect(() => PreferencesRepository.subscribe(setPrefs), []);
  return prefs;
}
