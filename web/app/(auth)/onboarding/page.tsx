"use client";

import { onboardingAction } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordField } from "@/components/auth/password-field";
import { TextField } from "@/components/auth/text-field";
import type { SignUpForm } from "@/lib/auth-form-schema";
import { signUpFormSchema } from "@/lib/auth-form-schema";
import { notifyError } from "@/lib/notify";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export default function Onboarding() {
  const form = useForm<SignUpForm>({
    resolver: zodResolver(signUpFormSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { isValid, isSubmitting } = form.formState;

  async function onSubmit(data: SignUpForm) {
    const result = await onboardingAction(data);

    if (result?.error) {
      notifyError("Could not create your account", result.error);
    }
  }

  return (
    <AuthCard
      formId="form-onboarding"
      submitLabel="Create User"
      isSubmitDisabled={!isValid || isSubmitting}
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <TextField
        control={form.control}
        name="username"
        label="Username"
        placeholder="John Doe"
      />
      <PasswordField control={form.control} name="password" />
      <PasswordField
        control={form.control}
        name="confirmPassword"
        label="Confirm Password"
      />
    </AuthCard>
  );
}
