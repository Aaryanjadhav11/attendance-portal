import Cookies from "js-cookie";

const PRN_COOKIE = "ritcms_prn";
const PASSWORD_COOKIE = "ritcms_password";
const COOKIE_EXPIRY_DAYS = 30;

export interface SavedCredentials {
  prn: string;
  password: string;
}

export function getSavedCredentials(): SavedCredentials | null {
  const prn = Cookies.get(PRN_COOKIE);
  const password = Cookies.get(PASSWORD_COOKIE);
  if (!prn || !password) return null;
  return { prn, password };
}

export function saveCredentials(prn: string, password: string): void {
  Cookies.set(PRN_COOKIE, prn, { expires: COOKIE_EXPIRY_DAYS });
  Cookies.set(PASSWORD_COOKIE, password, { expires: COOKIE_EXPIRY_DAYS });
}

export function clearCredentials(): void {
  Cookies.remove(PRN_COOKIE);
  Cookies.remove(PASSWORD_COOKIE);
}
