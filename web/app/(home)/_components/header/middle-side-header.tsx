import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { SearchIcon } from "lucide-react";

export function MiddleSideHeader() {
  return (
    <div className="w-full">
      <InputGroup>
        <InputGroupInput placeholder="Search some files" />
        <InputGroupAddon align="inline-start">
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
