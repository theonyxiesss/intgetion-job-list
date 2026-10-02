export function hostedSsl(connectionString: string) {
  const hostname = new URL(connectionString).hostname;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    return undefined;
  }
  return { rejectUnauthorized: false };
}

export function withoutSslMode(connectionString: string) {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  return url.toString();
}
