/** Read the error message from a failed API response ({ error: string } or { error: { message } }). */
export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  const error = data?.error;
  if (typeof error === "string") return error;
  if (typeof error?.message === "string") return error.message;
  return fallback;
}
