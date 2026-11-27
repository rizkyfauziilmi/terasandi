"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";

import { createFirstAdmin } from "./actions";

const formSchema = z
  .object({
    email: z.email("Enter a valid email address."),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters.")
      .max(30, "Username must be at most 30 characters.")
      .regex(
        /^[A-Za-z0-9_.]+$/,
        "Use letters, numbers, dots, or underscores.",
      ),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

export function OnboardingForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: FormValues) {
    await toast.promise(
      (async () => {
        const result = await createFirstAdmin({
          email: values.email,
          username: values.username,
          password: values.password,
        });

        if (!result.ok) {
          throw new Error(result.error);
        }

        const signInResult = await authClient.signIn.email({
          email: values.email,
          password: values.password,
        });

        if (signInResult.error) {
          throw new Error(
            signInResult.error.message ?? "Failed to sign in. Please sign in manually.",
          );
        }

        form.reset();
        router.replace("/");
        router.refresh();
      })(),
      {
        loading: "Creating the admin account...",
        success: "Setup complete. Welcome to Terasandi.",
        error: (error: unknown) =>
          error instanceof Error
            ? error.message
            : "Failed to complete setup. Please try again.",
      },
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Set up Terasandi</CardTitle>
        <CardDescription>
          Create the first administrator account to get started.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="username"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    autoComplete="username"
                    placeholder="johndoe"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Use 3-30 letters, numbers, dots, or underscores.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id={field.name}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      aria-invalid={fieldState.invalid}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id={field.name}
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      aria-invalid={fieldState.invalid}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirmation password"
                            : "Show confirmation password"
                        }
                        onClick={() =>
                          setShowConfirmPassword((value) => !value)
                        }
                      >
                        {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            Create admin account
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
