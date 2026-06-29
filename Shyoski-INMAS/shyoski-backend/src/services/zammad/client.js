// src/services/zammad/client.js

export class ZammadClient {
  /**
   * Performs an authenticated fetch request against Zammad REST API
   * @param {object} env Hono bindings/environment context
   * @param {string} path API path starting with /
   * @param {object} [options={}] fetch options
   */
  static async request(env, path, options = {}) {
    const baseUrl = env.ZAMMAD_URL;
    const token = env.ZAMMAD_API_TOKEN;

    if (!baseUrl || !token) {
      throw new Error("Zammad integration is not configured. Missing ZAMMAD_URL or ZAMMAD_API_TOKEN.");
    }

    const sanitizedUrl = baseUrl.replace(/\/$/, "");
    const url = `${sanitizedUrl}/api/v1${path}`;

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Token token=${token}`,
      ...(options.headers || {})
    };

    const res = await fetch(url, {
      ...options,
      headers
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`Zammad API request to ${path} failed (${res.status}): ${errorText}`);
    }

    return res.json();
  }
}
