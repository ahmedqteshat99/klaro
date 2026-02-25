/**
 * Calls the Anthropic API with automatic retry on 529 (overloaded) errors.
 * Retries up to `maxRetries` times with exponential backoff starting at `initialDelayMs`.
 */
export async function fetchAnthropicWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3,
    initialDelayMs = 1000
): Promise<Response> {
    let lastResponse: Response | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const response = await fetch(url, options);

        // 529 = Anthropic overloaded, 500 may also be transient — retry both
        if (response.status === 529 || response.status === 500) {
            lastResponse = response;
            if (attempt < maxRetries) {
                const delay = initialDelayMs * Math.pow(2, attempt); // 1s, 2s, 4s
                console.warn(`Anthropic returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise((r) => setTimeout(r, delay));
                continue;
            }
        }

        return response;
    }

    // Return the last failed response so the caller can handle it
    return lastResponse!;
}
