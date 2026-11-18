import { Suspense } from "react";
import { DashboardSkeleton } from "./_components/files/dashboard-skeleton";
import { FilesSection } from "./_components/files/files-section";

export const instant = false;

export default function Home() {
  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">My files</h1>
        <p className="text-sm text-muted-foreground">
          Upload and manage your private files. Only you can see them.
        </p>
      </header>
      <Suspense fallback={<DashboardSkeleton />}>
        <FilesSection />
      </Suspense>
    </div>
  );
}
