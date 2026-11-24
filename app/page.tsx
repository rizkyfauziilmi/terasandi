import { Suspense } from "react";
import { db } from "@/db";
import { notes } from "@/db/schema";

async function NotesList() {
  const rows = await db.select().from(notes).orderBy(notes.id);

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        No notes yet. Run <code className="font-mono">pnpm db:seed</code>.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {rows.map((note) => (
        <li
          key={note.id}
          className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {note.title}
          </h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">{note.body}</p>
          <time className="mt-3 block text-xs text-zinc-400 dark:text-zinc-500">
            {note.createdAt.toISOString()}
          </time>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Terasandi · Drizzle demo
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Notes read directly from PostgreSQL in a Server Component.
        </p>
        <div className="mt-10">
          <Suspense
            fallback={
              <p className="text-zinc-500 dark:text-zinc-400">Loading notes…</p>
            }
          >
            <NotesList />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
