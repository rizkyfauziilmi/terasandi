import { HomeHeader } from "./_components/header/home-header";

export default function HomeLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col">
      <HomeHeader />
      <main className="flex flex-1 flex-col px-4 py-6">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
