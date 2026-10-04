import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address cannot be empty")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password cannot be empty")
    .min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().default(false),
});

export type LoginFormData = z.infer<typeof loginSchema>;
