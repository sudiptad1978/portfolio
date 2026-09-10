import type { SectionId } from '../../config/site.config';

/**
 * Templates are section-order + visibility presets rendered by the SAME
 * shared components — not forked component trees (see architecture doc §10).
 */
export interface Template {
  id: string;
  label: string;
  description: string;
  sections: SectionId[];
}

import { developerTemplate } from './developer';
import { qaEngineerTemplate } from './qa-engineer';
import { sdetTemplate } from './sdet';
import { technicalLeadTemplate } from './technical-lead';

export const templates: Record<string, Template> = {
  developer: developerTemplate,
  'qa-engineer': qaEngineerTemplate,
  sdet: sdetTemplate,
  'technical-lead': technicalLeadTemplate,
};

export const sectionLabels: Record<SectionId, string> = {
  hero: 'Home',
  pov: 'Point of view',
  capabilities: 'What I bring',
  stack: 'Stack',
  projects: 'Projects',
  experience: 'Experience',
  snapshot: 'Snapshot',
  education: 'Education',
  blog: 'Writing',
  contact: 'Contact',
};
