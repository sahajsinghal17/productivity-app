const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export async function checkApiHealth() {
  const response = await fetch(`${API_BASE_URL}/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API health check failed: ${response.status}`);
  }

  return response.json() as Promise<{
    status: string;
    message: string;
  }>;
}