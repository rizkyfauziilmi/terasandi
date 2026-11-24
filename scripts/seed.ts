import { db } from "@/db";
import { notes } from "@/db/schema";

async function main() {
  try {
    const existing = await db.select().from(notes).limit(1);

    if (existing.length > 0) {
      console.log("Notes already seeded");
      return;
    }

    await db.insert(notes).values([
      {
        title: "Hello from Drizzle",
        body: "This row was inserted by the db:seed script.",
      },
      {
        title: "Server Components",
        body: "The home page reads this table directly on the server.",
      },
    ]);
    console.log("Seeded 2 notes");
  } finally {
    await db.$client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
