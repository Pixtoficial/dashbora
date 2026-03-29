import { User } from "@/types";

export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
}

const USERS: Array<User & { password: string }> = [
  {
    id: "user-1",
    email: "mw@trafego.com",
    password: "mwtrafego",
    name: "MW Tráfego",
    company: "MW Tráfego",
    avatar: "MW",
    role: "admin",
  },
  {
    id: "user-2",
    email: "materializa@trafego.com",
    password: "materializa",
    name: "Materializa",
    company: "Materializa",
    avatar: "MT",
    role: "viewer",
  },
];

const STORAGE_KEY = "dash_trafego_user";

export async function login(email: string, password: string): Promise<LoginResult> {
  await new Promise((r) => setTimeout(r, 900));
  const found = USERS.find((u) => u.email === email && u.password === password);
  if (!found) return { success: false, error: "E-mail ou senha incorretos." };
  const { password: _, ...user } = found;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
  return { success: true, user };
}

export function logout(): void {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

