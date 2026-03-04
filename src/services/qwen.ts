import { assertNativeApiBaseUrl, buildApiUrl } from "./apiBase";
import { requestJson } from "./httpClient";

export interface QwenSearchResponse {
  content: string;
  sources: { title: string; url: string }[];
}

export async function searchWebData(
  query: string,
  target: string
): Promise<QwenSearchResponse> {
  assertNativeApiBaseUrl();

  const response = await requestJson(buildApiUrl("/api/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { query, target },
  });

  if (!response.ok) {
    const data = response.data as any;
    throw new Error(data?.error || `Search failed: ${response.status}`);
  }

  return response.data as QwenSearchResponse;
}
