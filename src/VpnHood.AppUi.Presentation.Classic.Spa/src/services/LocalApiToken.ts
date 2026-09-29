// The local web host's token, which it hands this page after "#" in its address (the app's
// LocalApiToken): every API call sends it as a bearer header. Kept in sessionStorage too, since a
// reload of the page's own loads the address the router last showed, which lost the "#" at the first
// move within the page; a token in the address wins over a kept one. A page from the remote listener
// has none, and its pairing cookie speaks for it.
const storageKey = 'vh-local-token';

function readFromAddress(): string | null {
  const match = /^#token=(.+)$/.exec(window.location.hash);
  return match ? decodeURIComponent(match[1]) : null;
}

// Read as the module loads, before the router's first move drops the "#".
const token: string | null = readFromAddress() ?? sessionStorage.getItem(storageKey);
if (token)
  sessionStorage.setItem(storageKey, token);

// The header an API call carries: the token as a bearer, or nothing where there is none.
export function localApiTokenHeader(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
