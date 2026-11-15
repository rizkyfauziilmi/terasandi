import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "./auth-cookie";

/** Store the API access token in an HttpOnly cookie. Server Actions only. */
export async function setAccessToken(token: string, expiresIn: number) {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn,
  });
}

/** Remove the access token cookie. Server Actions only. */
export async function clearAccessToken() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
}
