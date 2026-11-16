import { toast } from "@/components/ui/toast";

/** Show a server-action failure as an error toast. */
export function notifyError(title: string, description: string) {
  toast.add({ type: "error", title, description });
}

/** Show a completed server action as a success toast. */
export function notifySuccess(title: string, description: string) {
  toast.add({ type: "success", title, description });
}
