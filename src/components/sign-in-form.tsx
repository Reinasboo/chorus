"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "");

    try {
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name });

      if (result.error) {
        setMessage(result.error.message ?? "We couldn't sign you in.");
        return;
      }

      const requestedPath = searchParams.get("returnTo");
      const returnTo =
        requestedPath && /^\/invite\/[A-Za-z0-9_-]{43}$/.test(requestedPath)
          ? requestedPath
          : "/overview";
      router.replace(returnTo);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message || "The authentication service is unavailable.");
      } else {
        setMessage("The authentication service is unavailable.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-mode-switcher" aria-label="Authentication mode">
        <button className={mode === "sign-in" ? "is-active" : ""} type="button" onClick={() => { setMode("sign-in"); setMessage(""); }}>Sign in</button>
        <button className={mode === "sign-up" ? "is-active" : ""} type="button" onClick={() => { setMode("sign-up"); setMessage(""); }}>Create account</button>
      </div>
      {mode === "sign-up" && (
        <label>
          Your name
          <input name="name" autoComplete="name" required maxLength={80} />
        </label>
      )}
      <label>
        Email address
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <label>
        Password
        <span className="password-field">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            required
            minLength={8}
            maxLength={128}
          />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? "Hide" : "Show"}
          </button>
        </span>
      </label>
      {message && <p className="form-message" role="alert">{message}</p>}
      <button className="button button-primary button-wide" disabled={busy}>
        {busy ? "One moment..." : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>
      <p className="form-switch">By continuing, you agree to use Chorus as a coordination record—not as proof of settlement.</p>
    </form>
  );
}
