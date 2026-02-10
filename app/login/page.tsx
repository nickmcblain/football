"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const requestedPath = searchParams.get("next");
    if (!requestedPath) return "/players";
    if (!requestedPath.startsWith("/") || requestedPath.startsWith("//")) return "/players";
    return requestedPath;
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Failed to authenticate");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <div className="w-full rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-bold">Bombers FC</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the site password to continue.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
            required
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Checking..." : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}
