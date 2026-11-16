"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema } from "@terasandi/contracts";
import type { CreateUserDto } from "@terasandi/contracts";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createUserAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { notifyError, notifySuccess } from "@/lib/notify";
import { FormField, FormPasswordField } from "./form-field";

const FORM_ID = "admin-create-user";

/** The header button and dialog that add an account. */
export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm<CreateUserDto>({
    mode: "onChange",
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: "", password: "" },
  });
  const { isValid, isSubmitting } = form.formState;

  function handleOpenChange(next: boolean) {
    setOpen(next);

    if (!next) {
      form.reset();
    }
  }

  async function onSubmit(data: CreateUserDto) {
    const result = await createUserAction(data);

    if ("error" in result) {
      notifyError("Could not create user", result.error);
      return;
    }

    notifySuccess("User created", `${data.username} can now sign in.`);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Create user
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            New accounts start as regular users. Promote them afterwards if
            needed.
          </DialogDescription>
        </DialogHeader>
        <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <FormField
              control={form.control}
              name="username"
              label="Username"
              placeholder="jane_doe"
            />
            <FormPasswordField
              control={form.control}
              name="password"
              label="Password"
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Creating…" : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
