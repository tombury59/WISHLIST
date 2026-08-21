// Petit helper commun aux appels client vers /api. Chaque requête joint le
// code famille dans l'en-tête `x-family-pin` et lève une erreur si la réponse
// n'est pas OK.
export async function request(path, pin, options = {}) {
  const headers = { "x-family-pin": pin, ...(options.headers || {}) };
  if (options.body != null) headers["Content-Type"] = "application/json";
  const res = await fetch(path, { cache: "no-store", ...options, headers });
  if (!res.ok) {
    const err = new Error("request-failed");
    err.status = res.status;
    throw err;
  }
  return res.json();
}
