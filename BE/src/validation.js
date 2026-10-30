import { z } from 'zod';

const trimmed = (max) => z.string().trim().min(1).max(max);

export const adminLoginSchema = z.object({
  username: trimmed(100),
  password: z.string().min(1).max(200)
}).strict();

export const wishSchema = z.object({
  guestName: trimmed(100).min(2),
  message: trimmed(500).min(3)
}).strict();

export const rsvpSchema = z.object({
  guestName: trimmed(100).min(2),
  phone: z.string().trim().max(30).optional().default(''),
  attendance: z.enum(['attending', 'not_attending', 'maybe']),
  guestCount: z.coerce.number().int().min(1).max(10),
  note: z.string().trim().max(500).optional().default('')
}).strict();

export const wishVisibilitySchema = z.object({ isVisible: z.boolean() }).strict();
