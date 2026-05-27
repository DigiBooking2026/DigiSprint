import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextApiRequest, NextApiResponse } from "next";
import { parse, serialize } from "cookie";

const secretKey = "super-secret-key-for-jira-clone-yolo-mode";
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

export async function decrypt(input: string): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload as Record<string, unknown>;
}

// Support for Pages Router API routes
export async function getSessionFromRequest(req: NextApiRequest | Request) {
  let sessionStr: string | undefined;

  if (req instanceof Request) {
    // App Router Request or standard Request
    const cookieStore = await cookies();
    sessionStr = cookieStore.get("session")?.value;
  } else {
    // Pages Router Request
    const cookiesObj = parse(req.headers.cookie || "");
    sessionStr = cookiesObj.session;
  }

  if (!sessionStr) return null;
  try {
    return await decrypt(sessionStr);
  } catch {
    return null;
  }
}

export async function setSessionCookie(res: NextApiResponse, userId: string) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await encrypt({ userId, expires });

  res.setHeader("Set-Cookie", serialize("session", session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  }));
}

export function clearSessionCookie(res: NextApiResponse) {
  res.setHeader("Set-Cookie", serialize("session", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  }));
}

