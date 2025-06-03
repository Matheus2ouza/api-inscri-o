import { Redis } from "@upstash/redis";

export const redis = new Redis({
       url: process.env.KV_REST_API_URL,
       token: process.env.KV_REST_API_TOKEN,
       timeout: 10000, // 10 seconds
       enableTelemetry: false,
       retryStrategy: (attempt) =>{
              if (attempt > 3) return null;
              return attempt * 1000; // Retry after 1 second, 2 seconds, etc.
       }
})