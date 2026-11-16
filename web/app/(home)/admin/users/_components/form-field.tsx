"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
}

/** A controlled text input with its label and validation message. */
export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
}: FormFieldProps<T>) {
  const id = `admin-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...field}
            id={id}
            aria-invalid={fieldState.invalid}
            placeholder={placeholder}
            autoComplete="off"
            required
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

/** A password input with a label, a visibility toggle, and its error message. */
export function FormPasswordField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = "@my_very_secret_password",
}: FormFieldProps<T>) {
  const [visible, setVisible] = useState(false);
  const id = `admin-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              {...field}
              id={id}
              aria-invalid={fieldState.invalid}
              placeholder={placeholder}
              autoComplete="new-password"
              type={visible ? "text" : "password"}
              required
            />
            <InputGroupAddon align="inline-end">
              <Button
                type="button"
                variant="ghost"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible((prev) => !prev)}
              >
                {visible ? <EyeIcon /> : <EyeOffIcon />}
              </Button>
            </InputGroupAddon>
          </InputGroup>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
