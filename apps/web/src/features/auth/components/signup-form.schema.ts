import { z } from 'zod';

export const isStrongSignupPassword = (value: string): boolean =>
  value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);

export const signupPasswordErrorKey = (
  message: string | undefined
): 'ownerPasswordRequired' | 'ownerPasswordHelper' =>
  message === 'weak' ? 'ownerPasswordHelper' : 'ownerPasswordRequired';

export const signupFormSchema = z
  .object({
    name: z.string().trim().min(2),
    ownerName: z.string().trim().min(2),
    ownerEmail: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    ownerPassword: z.string(),
    ownerPasswordConfirm: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.ownerPassword.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['ownerPassword'], message: 'required' });
    } else if (!isStrongSignupPassword(data.ownerPassword)) {
      ctx.addIssue({ code: 'custom', path: ['ownerPassword'], message: 'weak' });
    }
    if (data.ownerPassword !== data.ownerPasswordConfirm) {
      ctx.addIssue({ code: 'custom', path: ['ownerPasswordConfirm'], message: 'mismatch' });
    }
  });

export type SignupFormData = z.infer<typeof signupFormSchema>;
