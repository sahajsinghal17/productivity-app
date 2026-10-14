"use client";

import Link from "next/link";
import { useState } from "react";
import { apiRequest } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);    

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            P
          </span>
          Productivity
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-10">
          <div className="mb-8">
            <p className="mb-3 text-sm font-medium text-blue-600 dark:text-blue-400">
              WELCOME BACK
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Log in to your account
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
              Pick up where you left off.
            </p>
          </div>

          <form
            className="space-y-5"
                onSubmit={async (event) => {
                event.preventDefault();
                setError("");
                setIsSubmitting(true);

                try {
                    await apiRequest("/auth/login", {
                    method: "POST",
                    body: JSON.stringify({
                        email: email.trim(),
                        password,
                    }),
                    });

                    window.location.href = "/";
                } catch (err) {
                    setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to log in. Please try again.",
                    );
                } finally {
                    setIsSubmitting(false);
                }
            }}
          >
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700"
              />
            </div>

            {error && (
                <p role="alert" className="text-sm text-red-500">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                {isSubmitting ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Sign up
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-500">
          Your personal workspace, built around you.
        </p>
      </div>
    </main>
  );
}
