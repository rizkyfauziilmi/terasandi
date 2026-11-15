"use client";

import { signInAction } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordField } from "@/components/auth/password-field";
import { TextField } from "@/components/auth/text-field";
import { notifyError } from "@/lib/notify";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema } from "@terasandi/contracts";
import type { SignInDto } from "@terasandi/contracts";
import { useForm } from "react-hook-form";

export default function SignIn() {
  const form = useForm<SignInDto>({
    mode: "onChange",
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const { isValid, isSubmitting } = form.formState;

  async function onSubmit(data: SignInDto) {
    const result = await signInAction(data);

    if (result?.error) {
      notifyError("Could not sign in", result.error);
    }
  }

  return (
    <AuthCard
      formId="form-signin"
      submitLabel="Sign In"
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
    </AuthCard>
  );
}
