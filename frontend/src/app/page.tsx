"use client";

import { useEffect, useState } from "react";
import { checkApiHealth } from "@/lib/api";

type ApiStatus =
  | { state: "checking" }
  | { state: "connected"; message: string }
  | { state: "error"; message: string };

export default function Home() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    state: "checking",
  });

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-medium text-gray-500">
          Productivity App · Development
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Your workspace starts here.
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
          We're setting up the application foundation before building the
          productivity features.
        </p>

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