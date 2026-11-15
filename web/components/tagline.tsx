import { FolderOpen, KeyRound, ShieldLock } from "lucide-react";

export function Tagline() {
  return (
    <span className="flex items-center gap-2 justify-center">
      <FolderOpen className="size-4" /> Your files.{" "}
      <KeyRound className="size-4" /> Your keys.{" "}
      <ShieldLock className="size-4" /> Your rules.
    </span>
  );
}
