import type { FileUploadTicket } from "@terasandi/contracts";

/** POST JSON to a web route and unwrap the API error message. */
export async function postRoute<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error("Unable to reach the server.");
  }

  if (!response.ok) {
    throw new Error(await responseMessage(response));
  }

  return (await response.json()) as T;
}

/** XHR is used because `fetch` has no upload-progress events. */
export function putFile(
  ticket: FileUploadTicket,
  file: File,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(ticket.method, ticket.url);

    for (const [name, value] of Object.entries(ticket.headers)) {
      // The browser sets Content-Length from the file; setting it directly is
      // a forbidden header, even though it is part of the signed request.
      if (name.toLowerCase() === "content-length") {
        continue;
      }
      request.setRequestHeader(name, value);
    }

    const abort = () => request.abort();
    const cleanup = () => signal.removeEventListener("abort", abort);

    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    signal.addEventListener("abort", abort, { once: true });

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      cleanup();
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(storageErrorMessage(request.status)));
      }
    };
    request.onerror = () => {
      cleanup();
      reject(new Error("Upload failed. Check your connection and try again."));
    };
    request.onabort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    request.send(file);
  });
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

async function responseMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as {
    message?: unknown;
  };

  return typeof body.message === "string"
    ? body.message
    : "The server rejected the request.";
}

function storageErrorMessage(status: number): string {
  if (status === 403) {
    return "The upload link expired. Please try again.";
  }
  if (status === 413) {
    return "That file is too large.";
  }

  return "Storage refused the upload. Please try again.";
}
