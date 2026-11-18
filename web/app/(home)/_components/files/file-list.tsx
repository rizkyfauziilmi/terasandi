import type { StoredFile } from "@terasandi/contracts";
import {
  FileArchiveIcon,
  FileTextIcon,
  ImageIcon,
  MusicIcon,
  VideoIcon,
} from "lucide-react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { FILE_CATEGORY_LABELS, formatBytes, formatDate } from "@/lib/files";
import { FileRowActions } from "./file-row-actions";

const CATEGORY_ICONS: Record<StoredFile["category"], typeof FileTextIcon> = {
  document: FileTextIcon,
  image: ImageIcon,
  audio: MusicIcon,
  video: VideoIcon,
  other: FileArchiveIcon,
};

/** The user's files, newest first, each with its own download/rename/delete. */
export function FileList({ files }: { files: StoredFile[] }) {
  return (
    <ItemGroup className="gap-2">
      {files.map((file) => {
        const Icon = CATEGORY_ICONS[file.category];

        return (
          <Item key={file.id} variant="outline">
            <ItemMedia variant="icon">
              <Icon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{file.name}</ItemTitle>
              <ItemDescription>
                {FILE_CATEGORY_LABELS[file.category]} · {formatBytes(file.size)} ·{" "}
                {formatDate(file.createdAt)}
              </ItemDescription>
            </ItemContent>
            <ItemActions className="ml-auto">
              <FileRowActions file={file} />
            </ItemActions>
          </Item>
        );
      })}
    </ItemGroup>
  );
}
