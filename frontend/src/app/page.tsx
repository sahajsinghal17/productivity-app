"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, checkApiHealth } from "@/lib/api";

type ApiStatus =
  | { state: "checking" }
  | { state: "connected"; message: string }
  | { state: "error"; message: string };

type User = {
  id: string;
  name: string;
  email: string;
};

export default function Home() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    state: "checking",
  });

  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await apiRequest("/auth/logout", {
        method: "POST",
      });

      router.replace("/auth/login");
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Unable to log out. Please try again.",
      );
      setIsLoggingOut(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    checkApiHealth()
      .then((data) => {
        if (!cancelled) {
          setApiStatus({
            state: "connected",
            message: data.message,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiStatus({
            state: "error",
            message: "Could not connect to the backend API.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    apiRequest<{
      status: string;
      data: { user: User };
    }>("/auth/me")
      .then((result) => {
        if (!cancelled) {
          setUser(result.data.user);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        if (
          error instanceof Error &&
          error.message.toLowerCase().includes("authenticated")
        ) {
          router.replace("/auth/login");
          return;
        }

        setAuthError("Unable to verify your session. Please try again.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingAuth(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  
  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <p role="status">Checking your session…</p>
      </main>
    );
  }

  if (authError || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p role="alert" className="text-sm text-red-500">
            {authError || "Redirecting to login…"}
          </p>
          {authError && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Try again
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Productivity App · Development
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Welcome, {user.name}.
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
              Your personal workspace is ready for you.
            </p>
            <p className="mt-2 text-sm text-gray-500">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="shrink-0 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {isLoggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>

        {logoutError && (
          <p role="alert" className="mt-4 text-sm text-red-500">
            {logoutError}
          </p>
        )}

        <div className="mt-8 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <p className="text-sm font-semibold">Backend API</p>
          <p className="mt-2 text-sm" role="status" aria-live="polite">
            {apiStatus.state === "checking" && "Checking connection…"}
            {apiStatus.state === "connected" &&
              `Connected — ${apiStatus.message}`}
            {apiStatus.state === "error" && apiStatus.message}
          </p>
        </div>
      </section>
    </main>
  );

}