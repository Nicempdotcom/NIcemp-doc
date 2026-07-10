/**
 * data/index.ts
 *
 * Re-exports all raw JSON data as typed arrays.
 * Prefer importing from @/services/dataService for
 * filtered/searched access. Use these raw exports only
 * when you need the full unfiltered dataset.
 */

import type {
  DocModule,
  DocPage,
  DocComponent,
  DocHook,
  DocApi,
  DocTable,
} from '@/types';

import rawModules    from './modules.json';
import rawPages      from './pages.json';
import rawComponents from './components.json';
import rawHooks      from './hooks.json';
import rawApis       from './apis.json';
import rawDatabase   from './database.json';

export const allModules:    DocModule[]    = rawModules    as DocModule[];
export const allPages:      DocPage[]      = rawPages      as DocPage[];
export const allComponents: DocComponent[] = rawComponents as DocComponent[];
export const allHooks:      DocHook[]      = rawHooks      as DocHook[];
export const allApis:       DocApi[]       = rawApis       as DocApi[];
export const allTables:     DocTable[]     = rawDatabase   as DocTable[];
