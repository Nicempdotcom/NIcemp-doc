/**
 * IntegrationAnalyzer
 *
 * Detects external service integrations used by the project by cross-referencing:
 *   1. Installed npm packages (DependencyMap)
 *   2. Source file imports (to find which files use each integration)
 *   3. Env-var references in source code (process.env.X / import.meta.env.X)
 *
 * Only surface integrations that have an installed package — no false positives
 * from pattern matching alone.
 */

import type { ScannedFile, DependencyMap, DetectedIntegration, IntegrationCategory } from './types';

// ─── Catalog entry ────────────────────────────────────────────────────────────

interface CatalogEntry {
  name: string;
  category: IntegrationCategory;
  /** All npm package names that signal this integration (first is "primary"). */
  packages: string[];
  /** Env-var prefixes/names this service typically requires. */
  expectedEnvVars: string[];
}

// ─── Integration catalog ─────────────────────────────────────────────────────

const CATALOG: CatalogEntry[] = [
  // ── Payments ────────────────────────────────────────────────────────────────
  {
    name: 'Stripe',
    category: 'payments',
    packages: ['stripe', '@stripe/stripe-js', '@stripe/react-stripe-js'],
    expectedEnvVars: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'VITE_STRIPE_PUBLISHABLE_KEY'],
  },
  {
    name: 'PayPal',
    category: 'payments',
    packages: ['@paypal/react-paypal-js', '@paypal/paypal-js'],
    expectedEnvVars: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
  },
  {
    name: 'Mercado Pago',
    category: 'payments',
    packages: ['mercadopago', '@mercadopago/sdk-react'],
    expectedEnvVars: ['MERCADOPAGO_ACCESS_TOKEN', 'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY'],
  },

  // ── Database / BaaS ─────────────────────────────────────────────────────────
  {
    name: 'Supabase',
    category: 'database',
    packages: ['@supabase/supabase-js', '@supabase/ssr'],
    expectedEnvVars: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
  },
  {
    name: 'Firebase',
    category: 'database',
    packages: ['firebase', 'firebase-admin'],
    expectedEnvVars: ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_API_KEY', 'VITE_FIREBASE_API_KEY'],
  },
  {
    name: 'Upstash Redis',
    category: 'database',
    packages: ['@upstash/redis', '@upstash/ratelimit'],
    expectedEnvVars: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  },
  {
    name: 'PlanetScale',
    category: 'database',
    packages: ['@planetscale/database'],
    expectedEnvVars: ['DATABASE_URL', 'PLANETSCALE_DATABASE_URL'],
  },
  {
    name: 'Neon',
    category: 'database',
    packages: ['@neondatabase/serverless'],
    expectedEnvVars: ['DATABASE_URL', 'NEON_DATABASE_URL'],
  },
  {
    name: 'MongoDB Atlas',
    category: 'database',
    packages: ['mongodb', 'mongoose'],
    expectedEnvVars: ['MONGODB_URI', 'MONGODB_URL'],
  },

  // ── Auth ────────────────────────────────────────────────────────────────────
  {
    name: 'Clerk',
    category: 'auth',
    packages: ['@clerk/nextjs', '@clerk/clerk-react', '@clerk/remix', '@clerk/backend'],
    expectedEnvVars: ['CLERK_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'VITE_CLERK_PUBLISHABLE_KEY'],
  },
  {
    name: 'NextAuth / Auth.js',
    category: 'auth',
    packages: ['next-auth', '@auth/core', '@auth/drizzle-adapter', '@auth/prisma-adapter'],
    expectedEnvVars: ['NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'AUTH_SECRET'],
  },
  {
    name: 'Lucia',
    category: 'auth',
    packages: ['lucia', '@lucia-auth/adapter-drizzle', '@lucia-auth/adapter-prisma'],
    expectedEnvVars: [],
  },
  {
    name: 'Better Auth',
    category: 'auth',
    packages: ['better-auth'],
    expectedEnvVars: ['BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'],
  },
  {
    name: 'Auth0',
    category: 'auth',
    packages: ['@auth0/nextjs-auth0', '@auth0/auth0-react'],
    expectedEnvVars: ['AUTH0_SECRET', 'AUTH0_BASE_URL', 'AUTH0_ISSUER_BASE_URL', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET'],
  },
  {
    name: 'Passport.js',
    category: 'auth',
    packages: ['passport', 'passport-local', 'passport-google-oauth20', 'passport-jwt'],
    expectedEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'JWT_SECRET'],
  },

  // ── Storage ─────────────────────────────────────────────────────────────────
  {
    name: 'AWS S3',
    category: 'storage',
    packages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'aws-sdk'],
    expectedEnvVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET'],
  },
  {
    name: 'Cloudinary',
    category: 'storage',
    packages: ['cloudinary', 'next-cloudinary'],
    expectedEnvVars: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'],
  },
  {
    name: 'UploadThing',
    category: 'storage',
    packages: ['uploadthing', '@uploadthing/react'],
    expectedEnvVars: ['UPLOADTHING_SECRET', 'UPLOADTHING_APP_ID'],
  },
  {
    name: 'Vercel Blob',
    category: 'storage',
    packages: ['@vercel/blob'],
    expectedEnvVars: ['BLOB_READ_WRITE_TOKEN'],
  },

  // ── E-mail ──────────────────────────────────────────────────────────────────
  {
    name: 'Resend',
    category: 'email',
    packages: ['resend', '@react-email/components'],
    expectedEnvVars: ['RESEND_API_KEY'],
  },
  {
    name: 'SendGrid',
    category: 'email',
    packages: ['@sendgrid/mail', '@sendgrid/client'],
    expectedEnvVars: ['SENDGRID_API_KEY'],
  },
  {
    name: 'Nodemailer',
    category: 'email',
    packages: ['nodemailer', '@types/nodemailer'],
    expectedEnvVars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'],
  },
  {
    name: 'Mailgun',
    category: 'email',
    packages: ['mailgun.js', 'mailgun-js'],
    expectedEnvVars: ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN'],
  },

  // ── AI / LLMs ────────────────────────────────────────────────────────────────
  {
    name: 'OpenAI',
    category: 'ai',
    packages: ['openai', '@openai/agents'],
    expectedEnvVars: ['OPENAI_API_KEY'],
  },
  {
    name: 'Anthropic',
    category: 'ai',
    packages: ['@anthropic-ai/sdk'],
    expectedEnvVars: ['ANTHROPIC_API_KEY'],
  },
  {
    name: 'Groq',
    category: 'ai',
    packages: ['groq-sdk'],
    expectedEnvVars: ['GROQ_API_KEY'],
  },
  {
    name: 'Google AI (Gemini)',
    category: 'ai',
    packages: ['@google/generative-ai', '@google-ai/generativelanguage'],
    expectedEnvVars: ['GOOGLE_AI_API_KEY', 'GEMINI_API_KEY'],
  },
  {
    name: 'Vercel AI SDK',
    category: 'ai',
    packages: ['ai', '@ai-sdk/openai', '@ai-sdk/anthropic', '@ai-sdk/google'],
    expectedEnvVars: [],
  },
  {
    name: 'LangChain',
    category: 'ai',
    packages: ['langchain', '@langchain/core', '@langchain/openai'],
    expectedEnvVars: ['OPENAI_API_KEY', 'LANGCHAIN_API_KEY'],
  },

  // ── Analytics ────────────────────────────────────────────────────────────────
  {
    name: 'PostHog',
    category: 'analytics',
    packages: ['posthog-js', 'posthog-node'],
    expectedEnvVars: ['POSTHOG_KEY', 'NEXT_PUBLIC_POSTHOG_KEY', 'VITE_POSTHOG_KEY'],
  },
  {
    name: 'Mixpanel',
    category: 'analytics',
    packages: ['mixpanel-browser', 'mixpanel'],
    expectedEnvVars: ['MIXPANEL_TOKEN', 'NEXT_PUBLIC_MIXPANEL_TOKEN'],
  },
  {
    name: 'Vercel Analytics',
    category: 'analytics',
    packages: ['@vercel/analytics', '@vercel/speed-insights'],
    expectedEnvVars: [],
  },
  {
    name: 'Google Analytics',
    category: 'analytics',
    packages: ['react-ga4', 'react-ga', '@gtag/js'],
    expectedEnvVars: ['NEXT_PUBLIC_GA_ID', 'VITE_GA_ID'],
  },

  // ── Monitoring ──────────────────────────────────────────────────────────────
  {
    name: 'Sentry',
    category: 'monitoring',
    packages: ['@sentry/react', '@sentry/nextjs', '@sentry/node', '@sentry/browser'],
    expectedEnvVars: ['SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_AUTH_TOKEN'],
  },
  {
    name: 'LogRocket',
    category: 'monitoring',
    packages: ['logrocket'],
    expectedEnvVars: [],
  },

  // ── Messaging / Real-time ────────────────────────────────────────────────────
  {
    name: 'Twilio',
    category: 'messaging',
    packages: ['twilio'],
    expectedEnvVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
  },
  {
    name: 'Pusher',
    category: 'messaging',
    packages: ['pusher', 'pusher-js'],
    expectedEnvVars: ['PUSHER_APP_ID', 'PUSHER_KEY', 'PUSHER_SECRET', 'NEXT_PUBLIC_PUSHER_KEY'],
  },
  {
    name: 'Ably',
    category: 'messaging',
    packages: ['ably'],
    expectedEnvVars: ['ABLY_API_KEY'],
  },

  // ── GraphQL ─────────────────────────────────────────────────────────────────
  {
    name: 'Apollo Client',
    category: 'graphql',
    packages: ['@apollo/client', 'apollo-client'],
    expectedEnvVars: ['GRAPHQL_URL', 'NEXT_PUBLIC_GRAPHQL_URL'],
  },
  {
    name: 'urql',
    category: 'graphql',
    packages: ['urql', '@urql/core'],
    expectedEnvVars: [],
  },
  {
    name: 'Relay',
    category: 'graphql',
    packages: ['react-relay', 'relay-runtime'],
    expectedEnvVars: [],
  },

  // ── State Management ─────────────────────────────────────────────────────────
  {
    name: 'TanStack Query',
    category: 'state',
    packages: ['@tanstack/react-query', '@tanstack/vue-query', '@tanstack/solid-query'],
    expectedEnvVars: [],
  },
  {
    name: 'Zustand',
    category: 'state',
    packages: ['zustand'],
    expectedEnvVars: [],
  },
  {
    name: 'Redux Toolkit',
    category: 'state',
    packages: ['@reduxjs/toolkit', 'redux', 'react-redux'],
    expectedEnvVars: [],
  },
  {
    name: 'SWR',
    category: 'state',
    packages: ['swr'],
    expectedEnvVars: [],
  },
  {
    name: 'Jotai',
    category: 'state',
    packages: ['jotai'],
    expectedEnvVars: [],
  },
  {
    name: 'Recoil',
    category: 'state',
    packages: ['recoil'],
    expectedEnvVars: [],
  },
  {
    name: 'MobX',
    category: 'state',
    packages: ['mobx', 'mobx-react', 'mobx-react-lite'],
    expectedEnvVars: [],
  },
];

// ─── Env-var detection ────────────────────────────────────────────────────────

/** Extracts all env-var names referenced in source code. */
function extractEnvVars(files: ScannedFile[]): Map<string, string[]> {
  // Returns Map<envVarName, [filePaths...]>
  const result = new Map<string, string[]>();

  const ENV_RE = /(?:process\.env|import\.meta\.env)\.([A-Z_][A-Z0-9_]*)/g;

  for (const file of files) {
    if (file.isBinary || !file.content) continue;
    let match: RegExpExecArray | null;
    ENV_RE.lastIndex = 0;
    while ((match = ENV_RE.exec(file.content)) !== null) {
      const varName = match[1];
      const existing = result.get(varName) ?? [];
      if (!existing.includes(file.path)) {
        existing.push(file.path);
        result.set(varName, existing);
      }
    }
  }

  return result;
}

// ─── File-usage detection ─────────────────────────────────────────────────────

/** Returns a map of packageName → file paths that import it. */
function buildImportMap(files: ScannedFile[]): Map<string, string[]> {
  const result = new Map<string, string[]>();

  // Match: import ... from 'pkg', require('pkg'), import('pkg')
  const IMPORT_RE = /(?:from|require|import)\s*\(\s*['"]([^'"./][^'"]*)['"]/g;

  for (const file of files) {
    if (file.isBinary || !file.content) continue;
    let match: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(file.content)) !== null) {
      const rawPkg = match[1];
      // Normalize: '@scope/pkg/deep' → '@scope/pkg', 'pkg/deep' → 'pkg'
      const pkg = rawPkg.startsWith('@')
        ? rawPkg.split('/').slice(0, 2).join('/')
        : rawPkg.split('/')[0];
      const existing = result.get(pkg) ?? [];
      if (!existing.includes(file.path)) {
        existing.push(file.path);
        result.set(pkg, existing);
      }
    }
  }

  return result;
}

// ─── Analyzer ─────────────────────────────────────────────────────────────────

export class IntegrationAnalyzer {
  analyze(files: ScannedFile[], deps: DependencyMap): DetectedIntegration[] {
    const allDeps = new Set([
      ...deps.dependencies,
      ...deps.devDependencies,
      ...deps.peerDependencies,
    ].map((d) => d.name));

    const versionMap = new Map<string, string>();
    for (const d of [...deps.dependencies, ...deps.devDependencies, ...deps.peerDependencies]) {
      versionMap.set(d.name, d.version);
    }

    const importMap  = buildImportMap(files);
    const envVarMap  = extractEnvVars(files);

    const results: DetectedIntegration[] = [];

    for (const entry of CATALOG) {
      // Find which of the entry's packages are actually installed
      const installedPkg = entry.packages.find((p) => allDeps.has(p));
      if (!installedPkg) continue; // skip — not used

      // Collect all files that import any of the entry's packages
      const usedInFiles = new Set<string>();
      for (const pkg of entry.packages) {
        for (const filePath of importMap.get(pkg) ?? []) {
          usedInFiles.add(filePath);
        }
      }

      // Collect env vars actually found in the codebase that match expected names
      const detectedEnvVars = entry.expectedEnvVars.filter((v) => envVarMap.has(v));

      results.push({
        name:             entry.name,
        category:         entry.category,
        confidence:       usedInFiles.size > 0 ? 'high' : 'medium',
        version:          versionMap.get(installedPkg),
        packageName:      installedPkg,
        usedInFiles:      [...usedInFiles].sort(),
        detectedEnvVars,
        expectedEnvVars:  entry.expectedEnvVars,
      });
    }

    // Sort: by category priority, then alphabetically by name
    const CATEGORY_ORDER: IntegrationCategory[] = [
      'payments', 'auth', 'database', 'ai', 'storage', 'email',
      'analytics', 'monitoring', 'messaging', 'graphql', 'state', 'other',
    ];

    results.sort((a, b) => {
      const orderDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });

    return results;
  }
}
