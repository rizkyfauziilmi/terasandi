import { z } from "zod";
import { signUpSchema } from "@terasandi/contracts";

/**
 * The onboarding form: the shared API contract plus a confirmation field.
 * `confirmPassword` is a UI concern and is never sent to the API.
 */
export const signUpFormSchema = signUpSchema
  .extend({
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Confirm password must match password",
    path: ["confirmPassword"],
  });

export type SignUpForm = z.infer<typeof signUpFormSchema>;
