import { z } from 'zod';

/** Server-side validation for the contact form — never trust the client alone. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('A valid email address is required'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(5000),
  'cf-turnstile-response': z.string().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
