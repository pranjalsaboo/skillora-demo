import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import skilloraLogo from "@/assets/skillora-logo.png";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Skillora" },
      { name: "description", content: "Sign in to Skillora to keep your nursing lessons and progress in sync on every device." },
      { property: "og:title", content: "Sign in — Skillora" },
      { property: "og:description", content: "Keep your nursing lessons and progress in sync on every device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setError(error.message);
      else if (!data.session) setCheckEmail(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setBusy(false);
  }

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError("Google sign-in didn't work. Please try again.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <img src={skilloraLogo} alt="Skillora" className="h-16 w-16 rounded-2xl" />
        <h1 className="mt-4 text-2xl font-bold">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your lessons and progress stay in sync, even after learning offline.</p>
      </div>

      {checkEmail ? (
        <div className="chunky-card border border-border bg-card p-5 text-center">
          <p className="font-semibold">Check your email</p>
          <p className="mt-1 text-sm text-muted-foreground">We sent a confirmation link to {email}. Open it to start learning.</p>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={google}
            className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-sm font-semibold"
          >
            Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60">
              {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setError(null);
            }}
            className="mt-5 w-full text-center text-sm font-medium text-primary-deep"
          >
            {mode === "in" ? "New to Skillora? Create an account" : "Already have an account? Sign in"}
          </button>
        </>
      )}
    </main>
  );
}
