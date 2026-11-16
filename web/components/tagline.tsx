import { FolderOpenIcon, KeyRoundIcon, ShieldLockIcon } from "lucide-react";

interface TaglineProps {
  withIcon?: boolean;
}

export function Tagline({ withIcon = true }: TaglineProps) {
  if (!withIcon) {
    return (
      <span className="block max-w-xs text-xs opacity-85">
        Your files. Your keys. Your rules.
      </span>
    );
  }

  return (
    <span className="mx-auto flex max-w-xs flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs opacity-85">
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <FolderOpenIcon className="size-4 shrink-0" />
        Your files.
      </span>

      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <KeyRoundIcon className="size-4 shrink-0" />
        Your keys.
      </span>

      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <ShieldLockIcon className="size-4 shrink-0" />
        Your rules.
      </span>
    </span>
  );
}
