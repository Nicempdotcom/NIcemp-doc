/**
 * TechnologyAnalyzer
 *
 * Detects the technology stack of a project by examining:
 *   - Collected dependency names (from DependencyAnalyzer)
 *   - File extensions present in the project
 *   - Presence of specific configuration files
 */

import type { DependencyMap, TechnologyProfile, DetectedTechnology, ScannedFile } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function allDepNames(deps: DependencyMap): Set<string> {
  const names = new Set<string>();
  for (const d of [...deps.dependencies, ...deps.devDependencies, ...deps.peerDependencies]) {
    names.add(d.name);
  }
  return names;
}

function hasDep(deps: Set<string>, ...names: string[]): boolean {
  return names.some((n) => deps.has(n));
}

function depVersion(deps: DependencyMap, name: string): string | undefined {
  return [...deps.dependencies, ...deps.devDependencies, ...deps.peerDependencies]
    .find((d) => d.name === name)?.version;
}

function detected(
  name: string,
  confidence: DetectedTechnology['confidence'],
  deps: DependencyMap,
  depName?: string,
): DetectedTechnology {
  return {
    name,
    confidence,
    version: depName ? depVersion(deps, depName) : undefined,
  };
}

function fileExts(files: ScannedFile[]): Set<string> {
  return new Set(files.map((f) => f.ext.toLowerCase()));
}

function fileNames(files: ScannedFile[]): Set<string> {
  return new Set(files.map((f) => f.name.toLowerCase()));
}

// ─── Analyzer ─────────────────────────────────────────────────────────────────

export class TechnologyAnalyzer {
  analyze(files: ScannedFile[], deps: DependencyMap): TechnologyProfile {
    const depNames = allDepNames(deps);
    const exts     = fileExts(files);
    const names    = fileNames(files);

    // ── Languages ────────────────────────────────────────────────────────────
    const languages: DetectedTechnology[] = [];
    if (exts.has('.ts') || exts.has('.tsx')) {
      languages.push(detected('TypeScript', 'high', deps, 'typescript'));
    }
    if (exts.has('.js') || exts.has('.jsx') || exts.has('.mjs')) {
      const conf = (exts.has('.ts') || exts.has('.tsx')) ? 'medium' : 'high';
      languages.push({ name: 'JavaScript', confidence: conf });
    }
    if (exts.has('.py')) languages.push({ name: 'Python', confidence: 'high' });
    if (exts.has('.rs') || names.has('cargo.toml')) languages.push({ name: 'Rust', confidence: 'high' });
    if (exts.has('.go') || names.has('go.mod')) languages.push({ name: 'Go', confidence: 'high' });
    if (exts.has('.java')) languages.push({ name: 'Java', confidence: 'high' });
    if (exts.has('.cs')) languages.push({ name: 'C#', confidence: 'high' });
    if (exts.has('.php')) languages.push({ name: 'PHP', confidence: 'high' });

    // ── Frameworks ───────────────────────────────────────────────────────────
    const frameworks: DetectedTechnology[] = [];

    if (hasDep(depNames, 'next')) {
      frameworks.push(detected('Next.js', 'high', deps, 'next'));
    } else if (hasDep(depNames, 'react', 'react-dom')) {
      frameworks.push(detected('React', 'high', deps, 'react'));
    }
    if (hasDep(depNames, 'expo')) {
      frameworks.push(detected('Expo', 'high', deps, 'expo'));
    }
    if (hasDep(depNames, 'vue', '@vue/core')) {
      frameworks.push(detected('Vue', 'high', deps, 'vue'));
    }
    if (hasDep(depNames, 'nuxt')) {
      frameworks.push(detected('Nuxt', 'high', deps, 'nuxt'));
    }
    if (hasDep(depNames, '@angular/core')) {
      frameworks.push(detected('Angular', 'high', deps, '@angular/core'));
    }
    if (hasDep(depNames, 'svelte')) {
      frameworks.push(detected('Svelte', 'high', deps, 'svelte'));
    }
    if (hasDep(depNames, '@sveltejs/kit')) {
      frameworks.push(detected('SvelteKit', 'high', deps, '@sveltejs/kit'));
    }
    if (hasDep(depNames, '@remix-run/react', '@remix-run/node')) {
      frameworks.push(detected('Remix', 'high', deps, '@remix-run/react'));
    }
    if (hasDep(depNames, 'astro')) {
      frameworks.push(detected('Astro', 'high', deps, 'astro'));
    }

    // ── Styling ──────────────────────────────────────────────────────────────
    const styling: DetectedTechnology[] = [];
    if (hasDep(depNames, 'tailwindcss', '@tailwindcss/vite')) {
      styling.push(detected('Tailwind CSS', 'high', deps, 'tailwindcss'));
    }
    if (hasDep(depNames, 'styled-components')) {
      styling.push(detected('Styled Components', 'high', deps, 'styled-components'));
    }
    if (hasDep(depNames, '@emotion/react', '@emotion/styled')) {
      styling.push(detected('Emotion', 'high', deps, '@emotion/react'));
    }
    if (hasDep(depNames, 'sass', 'node-sass', 'sass-embedded')) {
      styling.push(detected('Sass / SCSS', 'high', deps, 'sass'));
    }
    if (hasDep(depNames, '@radix-ui/react-slot') || [...depNames].some((d) => d.startsWith('@radix-ui/'))) {
      styling.push(detected('shadcn/ui + Radix', 'high', deps));
    }
    if (files.some((f) => f.name.endsWith('.module.css'))) {
      styling.push({ name: 'CSS Modules', confidence: 'high' });
    }

    // ── Backend ──────────────────────────────────────────────────────────────
    const backend: DetectedTechnology[] = [];
    if (hasDep(depNames, 'express')) {
      backend.push(detected('Express', 'high', deps, 'express'));
    }
    if (hasDep(depNames, 'fastify')) {
      backend.push(detected('Fastify', 'high', deps, 'fastify'));
    }
    if (hasDep(depNames, 'hono')) {
      backend.push(detected('Hono', 'high', deps, 'hono'));
    }
    if (hasDep(depNames, '@nestjs/core')) {
      backend.push(detected('NestJS', 'high', deps, '@nestjs/core'));
    }
    if (hasDep(depNames, 'koa')) {
      backend.push(detected('Koa', 'high', deps, 'koa'));
    }
    if (hasDep(depNames, 'elysia')) {
      backend.push(detected('Elysia', 'high', deps, 'elysia'));
    }

    // ── Database ─────────────────────────────────────────────────────────────
    const database: DetectedTechnology[] = [];
    if (hasDep(depNames, 'drizzle-orm')) {
      database.push(detected('Drizzle ORM', 'high', deps, 'drizzle-orm'));
    }
    if (hasDep(depNames, '@prisma/client', 'prisma')) {
      database.push(detected('Prisma', 'high', deps, '@prisma/client'));
    }
    if (hasDep(depNames, 'typeorm')) {
      database.push(detected('TypeORM', 'high', deps, 'typeorm'));
    }
    if (hasDep(depNames, 'mongoose')) {
      database.push(detected('Mongoose', 'high', deps, 'mongoose'));
    }
    if (hasDep(depNames, 'kysely')) {
      database.push(detected('Kysely', 'high', deps, 'kysely'));
    }
    if (hasDep(depNames, 'sequelize')) {
      database.push(detected('Sequelize', 'high', deps, 'sequelize'));
    }
    if (hasDep(depNames, 'pg', 'postgres', 'better-sqlite3')) {
      const name = hasDep(depNames, 'pg') ? 'PostgreSQL' : hasDep(depNames, 'postgres') ? 'postgres.js' : 'SQLite';
      database.push(detected(name, 'high', deps));
    }

    // ── Testing ──────────────────────────────────────────────────────────────
    const testing: DetectedTechnology[] = [];
    if (hasDep(depNames, 'vitest')) {
      testing.push(detected('Vitest', 'high', deps, 'vitest'));
    }
    if (hasDep(depNames, 'jest', '@types/jest')) {
      testing.push(detected('Jest', 'high', deps, 'jest'));
    }
    if (hasDep(depNames, 'cypress')) {
      testing.push(detected('Cypress', 'high', deps, 'cypress'));
    }
    if (hasDep(depNames, '@playwright/test', 'playwright')) {
      testing.push(detected('Playwright', 'high', deps, '@playwright/test'));
    }
    if (hasDep(depNames, '@testing-library/react')) {
      testing.push(detected('Testing Library', 'high', deps, '@testing-library/react'));
    }

    // ── Build tools ──────────────────────────────────────────────────────────
    const buildTools: DetectedTechnology[] = [];
    if (hasDep(depNames, 'vite', '@vitejs/plugin-react')) {
      buildTools.push(detected('Vite', 'high', deps, 'vite'));
    }
    if (hasDep(depNames, 'webpack', 'webpack-cli')) {
      buildTools.push(detected('Webpack', 'high', deps, 'webpack'));
    }
    if (hasDep(depNames, 'esbuild')) {
      buildTools.push(detected('esbuild', 'high', deps, 'esbuild'));
    }
    if (hasDep(depNames, 'rollup')) {
      buildTools.push(detected('Rollup', 'high', deps, 'rollup'));
    }
    if (hasDep(depNames, 'parcel')) {
      buildTools.push(detected('Parcel', 'high', deps, 'parcel'));
    }
    if (hasDep(depNames, 'turbo')) {
      buildTools.push(detected('Turborepo', 'high', deps, 'turbo'));
    }

    // ── Runtime ──────────────────────────────────────────────────────────────
    const runtime: DetectedTechnology[] = [];
    const pm = deps.packageManager;
    if (pm !== 'unknown') {
      runtime.push({ name: { pnpm: 'pnpm', npm: 'npm', yarn: 'Yarn', bun: 'Bun' }[pm], confidence: 'high' });
    }
    if (names.has('bun.lockb') || hasDep(depNames, 'bun-types')) {
      runtime.push(detected('Bun', 'high', deps));
    }
    if (names.has('deno.json') || names.has('deno.jsonc')) {
      runtime.push({ name: 'Deno', confidence: 'high' });
    }
    if (hasDep(depNames, '@types/node') || deps.packages.some((p) => p.name.includes('node'))) {
      runtime.push({ name: 'Node.js', confidence: 'high' });
    }

    return { languages, frameworks, styling, backend, database, testing, buildTools, runtime };
  }
}
