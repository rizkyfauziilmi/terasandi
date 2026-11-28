"use client";

import { CircleCheckIcon, MailIcon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

import { resendVerificationEmail } from "./actions";

type VerifyEmailCardProps = {
  email: string;
  verified: boolean;
  error?: string;
};

function getErrorMessage(error: string) {
  if (error === "TOKEN_EXPIRED") {
    return "That verification link has expired. Request a new one below.";
  }

  if (error === "INVALID_TOKEN") {
    return "That verification link is invalid. Request a new one below.";
  }

  return "We couldn't verify that link. Request a new email below.";
}

export function VerifyEmailCard({
  email,
  verified,
  error,
}: VerifyEmailCardProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);

    try {
      await toast.promise(
        (async () => {
          const result = await resendVerificationEmail(email);

          if (!result.ok) {
            throw new Error(result.error);
          }
        })(),
        {
          loading: "Sending verification email...",
          success: "Verification email sent.",
          error: (reason: unknown) =>
            reason instanceof Error
              ? reason.message
              : "Failed to send the verification email.",
        },
      );
    } finally {
      setSending(false);
    }
  }

  if (verified) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleCheckIcon />
            Email verified
          </CardTitle>
          <CardDescription>
            Your email address has been verified. You can now sign in.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            type="button"
            className="w-full"
            onClick={() => router.replace("/sign-in")}
          >
            Continue to sign in
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Step 2 of 2: verify your email</CardTitle>
        <CardDescription>
          {email
            ? `We sent a verification link to ${email}. Open it to finish setting up Terasandi.`
            : "Open the verification link from your email to finish setting up Terasandi."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Verification failed</AlertTitle>
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          </Alert>
        ) : null}
        <p className="text-sm text-muted-foreground">
          The link expires in 1 hour. If you don&apos;t see the email, check
          your spam folder or send it again.
        </p>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        <Button
          type="button"
          className="w-full"
          disabled={sending || !email}
          onClick={resend}
        >
          <MailIcon data-icon="inline-start" />
          Resend verification email
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => router.refresh()}
        >
          <RefreshCwIcon data-icon="inline-start" />I verified my email
        </Button>
      </CardFooter>
    </Card>
  );
}
