import { FolderOpenIcon } from "lucide-react";

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-primary p-1.5 rounded-lg">
        <FolderOpenIcon className="text-primary fill-secondary size-6" />
      </div>
      <h3 className="text-lg font-bold">Terasandi</h3>
    </div>
  );
}
