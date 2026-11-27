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

const formSchema = z.object({
  identifier: z.string().min(1, "Email or username is required."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof formSchema>;

export function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  async function onSubmit(values: FormValues) {
    await toast.promise(
      (async () => {
        const result = values.identifier.includes("@")
          ? await authClient.signIn.email({
              email: values.identifier,
              password: values.password,
            })
          : await authClient.signIn.username({
              username: values.identifier,
              password: values.password,
            });

        if (result.error) {
          throw new Error(result.error.message ?? "Failed to sign in.");
        }

        form.reset();
        router.replace("/");
        router.refresh();
      })(),
      {
        loading: "Signing in...",
        success: "Signed in successfully.",
        error: (error: unknown) =>
          error instanceof Error
            ? error.message
            : "Failed to sign in. Please try again.",
      },
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in to Terasandi</CardTitle>
        <CardDescription>Your Data, Your Cloud, Your Control.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <FieldGroup>
            <Controller
              name="identifier"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Email or username
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    autoComplete="username"
                    placeholder="you@example.com or username"
                    aria-invalid={fieldState.invalid}
                  />
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
                      autoComplete="current-password"
                      placeholder="Enter your password"
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
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            Sign in
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
