"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

interface PasswordFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  idPrefix?: string;
  autoComplete?: string;
}

/** A password input with a label, a visibility toggle, and its error message. */
export function PasswordField<T extends FieldValues>({
  control,
  name,
  label = "Password",
  placeholder = "secret_password",
  idPrefix = "form",
  autoComplete = "off",
}: PasswordFieldProps<T>) {
  const [visible, setVisible] = useState(false);
  const id = `${idPrefix}-${name}`;

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
              autoComplete={autoComplete}
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
