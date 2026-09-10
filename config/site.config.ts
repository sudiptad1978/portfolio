import { z } from 'zod';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE single file a forker edits first.
 *  Everything here is validated with Zod at build time — a malformed config
 *  fails the build immediately with a readable error (free documentation).
 *  Zero D1/KV/R2 provisioning is required for the static-only path.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const sectionIdSchema = z.enum([
  'hero',
  'pov',
  'capabilities',
  'stack',
  'projects',
  'experience',
  'snapshot',
  'education',
  'blog',
  'contact',
]);
export type SectionId = z.infer<typeof sectionIdSchema>;

export const themeSchema = z.enum(['minimal', 'modern', 'terminal', 'professional']);
export const templateSchema = z.enum(['developer', 'qa-engineer', 'sdet', 'technical-lead']);
export const modeSchema = z.enum(['light', 'dark', 'system']);

const socialSchema = z.object({
  platform: z.enum(['github', 'linkedin', 'x', 'medium', 'mastodon', 'email', 'website']),
  label: z.string().optional(),
  url: z.string().url(),
});

const capabilitySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.enum(['shield', 'gauge', 'pipeline', 'layers']).optional(),
});

const stackGroupSchema = z.object({
  group: z.string().min(1),
  items: z.array(z.string()).min(1),
});

const projectSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'kebab-case slug required'),
  description: z.string().min(1),
  repoUrl: z.string().url().optional(),
  liveUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'ISO date (YYYY-MM or YYYY-MM-DD)');

const experienceSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().optional(),
  startDate: isoDate,
  endDate: isoDate.nullable().default(null), // null = current role
  summary: z.string().optional(),
  highlights: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

const educationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().optional(),
  period: z.string().optional(),
});

export const siteConfigSchema = z.object({
  // Identity
  name: z.string().min(1),
  role: z.string().min(1),
  headline: z.string().min(1),
  bio: z.string().min(1),
  location: z.string().optional(),
  email: z.string().email(),
  url: z.string().url(),
  avatar: z.string().default('/avatar.svg'),
  repoUrl: z.string().url().optional(), // "fork this template" link in footer

  // Appearance
  theme: themeSchema.default('modern'),
  template: templateSchema.default('developer'),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'hex color like #f97316')
    .optional(), // undefined = use the theme's default accent
  defaultMode: modeSchema.default('system'),

  // Links
  social: z.array(socialSchema).default([]),
  bookingUrl: z.string().url().optional(), // e.g. Cal.com — don't reinvent booking

  // Structure — omit to use the active template's section order
  sections: z.array(sectionIdSchema).optional(),

  // Content
  pov: z.object({
    kicker: z.string().optional(),
    title: z.string().min(1),
    body: z.array(z.string()).min(1),
  }),
  capabilities: z.array(capabilitySchema).min(1),
  stack: z.array(stackGroupSchema).min(1),
  projects: z.array(projectSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  snapshot: z
    .object({
      domains: z.array(z.string()).default([]),
      languages: z.array(z.string()).default([]),
      tools: z.array(z.string()).default([]),
    })
    .default({}),
  education: z.array(educationSchema).default([]),

  // Blog syndication
  blog: z
    .object({
      rssUrl: z.string().url().optional(),
      canonicalToSource: z
        .boolean()
        .default(true) /* true = the original article stays canonical (SEO-safe) */,
    })
    .default({}),

  // SEO
  seo: z.object({ ogImage: z.string().default('/og/default.png') }).default({}),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;

/* ── EDIT BELOW — sample data ships with the template; make it yours. ──────── */

const rawSiteConfig = {
  // Identity
  name: 'Sudipta Dutta',
  role: 'Quality Engineer',
  headline: 'I build quality systems that ship confidence — not just test counts.',
  bio: 'Quality engineer focused on test automation, cloud-native infrastructure, and CI/CD pipelines that make releases boring. This site is itself a working demo: an open-source, Cloudflare-native platform with a real test pipeline.',
  location: 'Stockholm, Sweden',
  email: 'hello@example.com', // TODO: replace with your address
  url: 'https://sudipta-dutta-portfolio.pages.dev',
  avatar: '/avatar.svg',
  repoUrl: 'https://github.com/sudiptad1978/portfolio',

  // Appearance
  theme: 'modern',
  template: 'qa-engineer',
  accent: '#f97316',
  defaultMode: 'system',

  // Links
  social: [
    { platform: 'github', url: 'https://github.com/sudiptad1978' },
    { platform: 'linkedin', url: 'https://www.linkedin.com/in/sudipta-dutta' }, // TODO: your handle
    { platform: 'medium', url: 'https://medium.com/@your-handle' }, // TODO: your handle
  ],
  bookingUrl: 'https://cal.com/your-handle/intro', // TODO: your booking link

  // Content — sample data, edit freely
  pov: {
    kicker: 'Point of view',
    title: 'Quality is a system property, not a phase.',
    body: [
      'Testing at the end finds defects; engineering quality into the pipeline prevents them. I work where automation, observability, and culture meet — so that every merge to main is releasable by default.',
      'The pipeline is the product of QA: a fast, trustworthy, boring pipeline is the best evidence of engineering quality a team can show.',
    ],
  },
  capabilities: [
    {
      title: 'Test automation architecture',
      description:
        'Layered, maintainable automation — UI, API, contract, and data checks designed for flake-resistance and fast feedback.',
      icon: 'layers',
    },
    {
      title: 'CI/CD quality gates',
      description:
        'Pipelines that fail fast and loudly: linting, typing, unit, integration, a11y, performance budgets, and security scanning as merge blockers.',
      icon: 'pipeline',
    },
    {
      title: 'Performance & reliability',
      description:
        'Load testing, Core Web Vitals budgets, and synthetic monitoring baked into delivery rather than bolted on after incidents.',
      icon: 'gauge',
    },
    {
      title: 'Risk-based security testing',
      description:
        'Practical security in delivery: dependency scanning, secret hygiene, CSP, and OWASP-aware test suites.',
      icon: 'shield',
    },
  ],
  stack: [
    {
      group: 'Test automation',
      items: ['Playwright', 'Cypress', 'Selenium WebDriver', 'REST Assured', 'Postman', 'k6'],
    },
    {
      group: 'Cloud & infrastructure',
      items: ['Cloudflare (Pages/Workers/D1)', 'AWS', 'Docker', 'Kubernetes', 'Terraform'],
    },
    {
      group: 'Languages',
      items: ['TypeScript', 'JavaScript', 'Python', 'Java', 'SQL', 'Bash'],
    },
    {
      group: 'CI/CD & observability',
      items: ['GitHub Actions', 'Jenkins', 'Grafana', 'Allure', 'Lighthouse CI', 'axe-core'],
    },
  ],
  projects: [
    {
      title: 'Portfolio Platform (this site)',
      slug: 'portfolio-platform',
      description:
        'Open-source, Cloudflare-native portfolio platform: Astro SSR, D1 blog syndication, KV caching, Turnstile-protected contact form, and a CI pipeline with a11y + performance gates. The pipeline is the demo.',
      repoUrl: 'https://github.com/sudiptad1978/portfolio',
      tags: ['Astro', 'Cloudflare', 'D1', 'Playwright', 'GitHub Actions'],
      featured: true,
    },
    {
      title: 'API Test Framework',
      slug: 'api-test-framework',
      description:
        'Contract and data-driven API testing framework with environment parallax, deterministic fixtures, and CI-ready reporting. (Sample entry — replace with your repo.)',
      tags: ['TypeScript', 'REST', 'Contract testing'],
    },
    {
      title: 'Quality Dashboard',
      slug: 'quality-dashboard',
      description:
        'Flake tracking, coverage trends, and release-readiness metrics on a single pane of glass. (Sample entry — replace with your repo.)',
      tags: ['Grafana', 'Observability', 'Metrics'],
    },
  ],
  experience: [
    {
      company: 'Nordic Fintech Scale-up', // TODO: sample entry — replace with your history
      role: 'Senior Quality Engineer',
      location: 'Stockholm, SE',
      startDate: '2021-06',
      endDate: null,
      summary: 'Own the automation strategy and quality gates for a payments platform.',
      highlights: [
        'Cut pipeline feedback time from 45 to under 10 minutes with layered, parallel test design.',
        'Introduced performance and accessibility budgets as merge blockers.',
        'Built synthetic monitoring and alerting for 6 critical user journeys.',
      ],
      tags: ['Playwright', 'TypeScript', 'Cloud', 'CI/CD'],
    },
    {
      company: 'Enterprise SaaS Provider', // TODO: sample entry
      role: 'QA Automation Engineer',
      location: 'Remote',
      startDate: '2018-03',
      endDate: '2021-05',
      summary: 'Scaled API and UI automation across a multi-team monorepo.',
      highlights: [
        'Migrated a legacy Selenium suite to Playwright, halving runtime and flake rate.',
        'Designed contract tests that caught 30+ integration regressions pre-release.',
      ],
      tags: ['Selenium', 'Java', 'REST', 'Jenkins'],
    },
    {
      company: 'Digital Agency', // TODO: sample entry
      role: 'QA Engineer',
      location: 'Kolkata, IN',
      startDate: '2016-01',
      endDate: '2018-02',
      summary: 'Manual-to-automated transition for client web and mobile projects.',
      highlights: [
        'Established regression suites and release checklists across 10+ client projects.',
      ],
      tags: ['Manual QA', 'Mobile', 'Agile'],
    },
  ],
  snapshot: {
    domains: ['Web applications', 'APIs & microservices', 'Serverless/edge', 'Data pipelines'],
    languages: ['TypeScript', 'JavaScript', 'Python', 'Java', 'SQL', 'Bash'],
    tools: ['Playwright', 'k6', 'GitHub Actions', 'Cloudflare', 'Docker', 'Grafana'],
  },
  education: [
    {
      institution: 'B.Sc. in Computer Science & Engineering', // TODO: sample entry
      period: '2012 – 2016',
    },
    { institution: 'ISTQB Certified Tester, Foundation Level', period: '2017' },
  ],

  // Blog syndication (optional — set here for docs; the cron worker reads its own env)
  blog: {
    canonicalToSource: true,
  },
};

/* ── Validate at import time: malformed config fails the build immediately. ── */

let siteConfig: SiteConfig;
try {
  siteConfig = siteConfigSchema.parse(rawSiteConfig);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('\n❌ Invalid config/site.config.ts:\n');
    for (const issue of error.issues) {
      console.error(`  • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    console.error('');
  }
  throw error;
}

export { siteConfig };
