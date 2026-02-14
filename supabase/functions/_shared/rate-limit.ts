/**
 * Rate Limiting Utility for Supabase Edge Functions
 * Prevents abuse of expensive AI operations
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
  endpoint: string;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  generate_cv: {
    endpoint: "generate_cv",
    maxRequests: 10,
    windowMinutes: 60, // 10 requests per hour
  },
  generate_anschreiben: {
    endpoint: "generate_anschreiben",
    maxRequests: 10,
    windowMinutes: 60, // 10 requests per hour
  },
  extract_job: {
    endpoint: "extract_job",
    maxRequests: 20,
    windowMinutes: 60, // 20 requests per hour
  },
  parse_cv: {
    endpoint: "parse_cv",
    maxRequests: 5,
    windowMinutes: 60, // 5 requests per hour
  },
};

export class RateLimitError extends Error {
  constructor(
    message: string,
    public remainingTime: number,
    public maxRequests: number
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Check and enforce rate limit for a user on a specific endpoint
 * @throws RateLimitError if rate limit is exceeded
 */
export async function enforceRateLimit(
  supabase: SupabaseClient,
  userId: string,
  config: RateLimitConfig
): Promise<void> {
  try {
    // Check if user is within rate limit
    const { data: isAllowed, error: checkError } = await supabase.rpc(
      "check_rate_limit",
      {
        p_user_id: userId,
        p_endpoint: config.endpoint,
        p_max_requests: config.maxRequests,
        p_window_minutes: config.windowMinutes,
      }
    );

    if (checkError) {
      console.error("Rate limit check error:", checkError);
      // Fail open - allow request if check fails (prevents service disruption)
      return;
    }

    if (!isAllowed) {
      const remainingMinutes = config.windowMinutes;
      throw new RateLimitError(
        `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMinutes} minutes. Try again in ${remainingMinutes} minutes.`,
        remainingMinutes,
        config.maxRequests
      );
    }

    // Log the request for rate limiting
    const { error: logError } = await supabase.rpc("log_rate_limit", {
      p_user_id: userId,
      p_endpoint: config.endpoint,
    });

    if (logError) {
      console.error("Rate limit log error:", logError);
      // Continue even if logging fails
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    // Fail open for other errors
    console.error("Rate limit enforcement error:", error);
  }
}

/**
 * Create a rate limit error response
 */
export function rateLimitResponse(error: RateLimitError, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: error.message,
      retryAfter: error.remainingTime * 60, // Convert to seconds
      maxRequests: error.maxRequests,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(error.remainingTime * 60),
        "X-RateLimit-Limit": String(error.maxRequests),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
