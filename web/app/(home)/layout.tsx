import { HomeHeader } from "./_components/header/home-header";

export default function HomeLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col">
      <HomeHeader />
      <main className="flex flex-1 items-center justify-center">
        {children}
      </main>
    </div>
  );
}
