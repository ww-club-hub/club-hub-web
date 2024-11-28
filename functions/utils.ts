export async function jsonResponse(status: number, response: Record<string, any>) {
  return new Response(JSON.stringify(response), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
