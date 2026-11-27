import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendVerificationEmailMail } from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationEmailMail({ to: user.email, url });
    },
    sendOnSignUp: true,
    // Better Auth 1.7 only resends on sign-in when this is explicitly enabled.
    sendOnSignIn: true,
    expiresIn: 60 * 60,
    autoSignInAfterVerification: false,
  },
  plugins: [username(), admin()],
  rateLimit: {
    enabled: true,
  },
});
