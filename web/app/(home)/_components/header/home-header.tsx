import { LeftSideHeader } from "./left-side-header";
import { MiddleSideHeader } from "./middle-side-header";
import { RightSideHeader } from "./right-side-header";

export function HomeHeader() {
  return (
    <header className="flex items-center justify-between border-b py-2 px-4 gap-6">
      <LeftSideHeader />
      <MiddleSideHeader />
      <RightSideHeader />
    </header>
  );
}
