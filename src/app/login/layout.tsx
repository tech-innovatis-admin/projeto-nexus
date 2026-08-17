import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { REAUTH_COOKIE } from "@/lib/auth/cognitoOidc";

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  if (jar.get(REAUTH_COOKIE)?.value === "1") {
    redirect("/auth/login");
  }
  return children;
}
