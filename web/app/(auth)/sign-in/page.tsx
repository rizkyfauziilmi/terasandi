"use client";

import Tagline from "@/components/tagline";
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
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { toast } from "@/components/ui/toast";
import { signInAction } from "@/app/actions/auth";
import { signInSchema } from "@terasandi/contracts";
import type { SignInDto } from "@terasandi/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

export default function SignIn() {
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const form = useForm<SignInDto>({
    mode: "onChange",
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const { isValid, isSubmitting } = form.formState;

  const isDisabledButton = !isValid || isSubmitting;

  async function onSubmit(data: SignInDto) {
    const result = await signInAction(data);

    if (result?.error) {
      toast.add({
        type: "error",
        title: "Could not sign in",
        description: result.error,
      });
    }
  }

  return (
    <Card className="max-w-sm w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Terasandi</CardTitle>
        <CardDescription>
          <Tagline />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="form-signin" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="username"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-username">Username</FieldLabel>
                  <Input
                    {...field}
                    id="form-username"
                    aria-invalid={fieldState.invalid}
                    placeholder="John Doe"
                    autoComplete="off"
                    required
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
                  <FieldLabel htmlFor="form-password">Password</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id="form-password"
                      aria-invalid={fieldState.invalid}
                      placeholder="@my_very_secret_password"
                      autoComplete="off"
                      type={showPassword ? "text" : "password"}
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <Button
                        variant="ghost"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                      </Button>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Field orientation="horizontal">
          <Button
            className="w-full"
            type="submit"
            form="form-signin"
            disabled={isDisabledButton}
          >
            Sign In
          </Button>
        </Field>
      </CardFooter>
    </Card>
  );
}
