"use client";

import { onboardingAction } from "@/app/actions/auth";
import { AuthCard } from "@/app/(auth)/_components/auth-card";
import type { SignUpForm } from "@/lib/auth-form-schema";
import { signUpFormSchema } from "@/lib/auth-form-schema";
import { notifyError } from "@/lib/notify";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { PasswordField } from "../_components/password-field";
import { TextField } from "../_components/text-field";

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
