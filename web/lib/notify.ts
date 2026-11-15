import { toast } from "@/components/ui/toast";

/** Show a server-action failure as an error toast. */
export function notifyError(title: string, description: string) {
  toast.add({ type: "error", title, description });
}
