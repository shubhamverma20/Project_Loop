const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`

  const headers = new Headers(options.headers || {})
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  // Attach bearer token if stored in localStorage for cross-domain auth fallback
  if (typeof window !== "undefined") {
    const savedToken = localStorage.getItem("session_token")
    if (savedToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${savedToken}`)
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include"
    })

    const contentType = response.headers.get("content-type")
    let responseData: any = null

    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
    }

    // Save token if returned in auth response
    if (typeof window !== "undefined" && responseData && typeof responseData === "object" && responseData.token) {
      localStorage.setItem("session_token", responseData.token)
    }

    if (!response.ok) {
      if (response.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("session_token")
      }
      const errorMessage = typeof responseData === "object" && responseData !== null && "error" in responseData
        ? String((responseData as { error: unknown }).error)
        : typeof responseData === "string" && responseData
        ? responseData
        : `Request failed with status ${response.status}`

      return { error: errorMessage, status: response.status }
    }

    return { data: responseData as T, status: response.status }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Network error. Unable to connect to server."
    console.error(`API Request Error [${endpoint}]:`, error)
    return { error: errMessage, status: 500 }
  }
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),

  put: <T = any>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" })
}
