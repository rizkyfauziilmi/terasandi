import type { ReactNode, SubmitEventHandler } from "react";
import { Tagline } from "@/components/tagline";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";

interface AuthCardProps {
  formId: string;
  submitLabel: string;
  isSubmitDisabled: boolean;
  onSubmit: SubmitEventHandler<HTMLFormElement>;
  children: ReactNode;
}

/** The shared frame and submit button for both auth forms. */
export function AuthCard({
  formId,
  submitLabel,
  isSubmitDisabled,
  onSubmit,
  children,
}: AuthCardProps) {
  return (
    <Card className="max-w-sm w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Terasandi</CardTitle>
        <CardDescription>
          <Tagline />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id={formId} onSubmit={onSubmit}>
          <FieldGroup>{children}</FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Field orientation="horizontal">
          <Button
            className="w-full"
            type="submit"
            form={formId}
            disabled={isSubmitDisabled}
          >
            {submitLabel}
          </Button>
        </Field>
      </CardFooter>
    </Card>
  );
}
