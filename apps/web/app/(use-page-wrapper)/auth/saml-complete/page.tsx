"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function SamlCompletePage() {
  const params = useSearchParams();
  useEffect(() => {
    const token = params?.get("token");
    const callbackUrl = params?.get("callbackUrl") || "/";
    if (!token) return;
    void signIn("impersonate", { token, callbackUrl });
  }, [params]);
  return <p className="p-8 text-center text-sm">Signing you in with SAML…</p>;
}
