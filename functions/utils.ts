export async function jsonResponse(status: number, response: Record<string, any>, headers?: Record<string, string>) {
  return new Response(JSON.stringify(response), {
    status,
    headers: headers ?? {
      "Content-Type": "application/json"
    }
  });
}

export async function authedJsonRequest<T = unknown>(body: any, token: string, url: string, method = "POST") {
  return await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: method === "GET" ? undefined : JSON.stringify(body)
  }).then(r => r.json<T>());
}
