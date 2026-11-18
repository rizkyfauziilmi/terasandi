import { FILE_CATEGORIES } from "@terasandi/contracts";
import type { FileCategory, FilesResponse } from "@terasandi/contracts";
import {
  FileArchiveIcon,
  FileTextIcon,
  ImageIcon,
  MusicIcon,
  VideoIcon,
} from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FILE_CATEGORY_LABELS } from "@/lib/files";

const CATEGORY_ICONS: Record<FileCategory, typeof FileTextIcon> = {
  document: FileTextIcon,
  image: ImageIcon,
  audio: MusicIcon,
  video: VideoIcon,
  other: FileArchiveIcon,
};

/** One card per category, counting only the signed-in user's files. */
export function SummaryCards({ totals }: { totals: FilesResponse["totals"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {FILE_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category];
        const count = totals[category];

        return (
          <Card key={category} size="sm">
            <CardHeader>
              <CardTitle>{FILE_CATEGORY_LABELS[category]}</CardTitle>
              <CardAction>
                <Icon className="size-5 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{count}</p>
              <p className="text-xs text-muted-foreground">
                {count === 1 ? "file" : "files"}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
