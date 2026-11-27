import { eq } from "drizzle-orm";
import type { Metadata } from "next";

import { db } from "@/db";
import { user } from "@/db/schema";

import { VerifyEmailCard } from "./verify-email-card";

export const metadata: Metadata = {
  title: "Verify Email",
};

// This page reads request-time search params and checks the database for the
// current verification status, so it must render on every request.
export const instant = false;

type VerifyEmailPageProps = {
  searchParams: Promise<{
    email?: string | string[];
    error?: string | string[];
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const emailParam = typeof params.email === "string" ? params.email : "";
  const errorParam = typeof params.error === "string" ? params.error : undefined;
  const email = emailParam.toLowerCase();

  const [record] = email.includes("@")
    ? await db
        .select({ emailVerified: user.emailVerified })
        .from(user)
        .where(eq(user.email, email))
        .limit(1)
    : [];

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <VerifyEmailCard
        email={email}
        verified={record?.emailVerified ?? false}
        error={errorParam}
      />
    </main>
  );
}
