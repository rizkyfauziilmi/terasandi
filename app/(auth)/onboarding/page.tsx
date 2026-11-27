import type { Metadata } from "next";

import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Set Up",
};

export default function OnboardingPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <OnboardingForm />
    </main>
  );
}
