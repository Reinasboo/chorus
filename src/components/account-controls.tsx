"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AccountControls() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function signOut() {
    setMessage("");
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setMessage(result.error.message ?? "We couldn't sign you out.");
        return;
      }
      router.replace("/sign-in");
      router.refresh();
    } catch (error) {
      if (error instanceof Error) setMessage(error.message);
      else setMessage("We couldn't sign you out.");
    }
  }

  return (
    <div className="account-controls">
      <button className="sign-out-button" type="button" onClick={signOut} aria-label="Sign out">↗</button>
      {message && <span className="form-message" role="alert">{message}</span>}
    </div>
  );
}
