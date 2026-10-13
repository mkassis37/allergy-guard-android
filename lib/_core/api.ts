import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "./auth";

function parseJsonSafely(text: string): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Native uses a stored bearer token; web uses the backend session cookie.
  if (Platform.OS !== "web") {
    const sessionToken = await Auth.getSessionToken();
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }
  }

  const baseUrl = getApiBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${cleanBaseUrl}${cleanEndpoint}` : endpoint;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    // Read the body only once; some servers return HTML/plain text on errors.
    const responseText = await response.text();
    const parsedBody = parseJsonSafely(responseText);

    if (!response.ok) {
      let errorMessage = responseText;
      if (
        parsedBody !== null &&
        typeof parsedBody === "object" &&
        !Array.isArray(parsedBody)
      ) {
        const errorBody = parsedBody as { error?: unknown; message?: unknown };
        const message = errorBody.error ?? errorBody.message;
        if (typeof message === "string" && message.trim()) {
          errorMessage = message;
        }
      }

      throw new Error(
        errorMessage || `API call failed: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      // JSON content types should normally parse as JSON. If a server sends
      // malformed JSON, return the raw response text rather than crashing.
      return parsedBody as T;
    }

    // Some endpoints return JSON without a JSON content-type; parseJsonSafely
    // handles that case and safely falls back to the original plain text.
    return parsedBody as T;
  } catch (error) {
    console.error("[API] Request failed:", error);
    if (error instanceof Error) throw error;
    throw new Error("Unknown error occurred");
  }
}

// OAuth callback handler - exchange code for session token.
export async function exchangeOAuthCode(
  code: string,
  state: string,
): Promise<{ sessionToken: string; user: any }> {
  const params = new URLSearchParams({ code, state });
  const endpoint = `/api/oauth/mobile?${params.toString()}`;
  const result = await apiCall<{ app_session_id: string; user: any }>(endpoint);

  return {
    sessionToken: result.app_session_id,
    user: result.user,
  };
}

export async function logout(): Promise<void> {
  await apiCall<void>("/api/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: string;
} | null> {
  try {
    const result = await apiCall<{ user: any }>("/api/auth/me");
    return result.user || null;
  } catch (error) {
    console.error("[API] getMe failed:", error);
    return null;
  }
}

// Establish a backend session cookie after receiving the OAuth token.
export async function establishSession(token: string): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetch(`${cleanBaseUrl}/api/auth/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });

    if (!response.ok) {
      console.error("[API] establishSession failed:", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[API] establishSession error:", error);
    return false;
  }
}
