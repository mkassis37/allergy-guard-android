    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log("[API] JSON response received");
      return data as T;
    }

    const text = await response.text();
    console.log("[API] Text response received");

    // Attempt to parse text as JSON but fall back to returning raw text if parsing fails.
    try {
      return (text ? JSON.parse(text) : {}) as T;
    } catch {
      // Not JSON — return raw text as the response type
      return (text as unknown) as T;
    }
