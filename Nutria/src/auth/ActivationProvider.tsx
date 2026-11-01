import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import config from "./activation-config.json";
import { verifyActivation } from "./license.mjs";
export type Activation = {
  email: string;
  accountId: string;
  licenseId: string;
  expiresAt: number | null;
  issuedAt: number;
};
const PUBLIC_KEY =
  process.env.EXPO_PUBLIC_ACTIVATION_PUBLIC_KEY || config.publicKey;
const KEY = "nutria.activation.v1";
type Value = {
  activation: Activation | null;
  ready: boolean;
  configured: boolean;
  error: string;
  activate: (email: string, code: string) => Promise<boolean>;
  signOut: () => Promise<boolean>;
};
const Context = createContext<Value | null>(null);
export function ActivationProvider({ children }: { children: ReactNode }) {
  const [activation, setActivation] = useState<Activation | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        if (Platform.OS !== "web") {
          const raw = await SecureStore.getItemAsync(KEY);
          if (raw) {
            const saved = JSON.parse(raw);
            const result = verifyActivation({
              ...saved,
              publicKey: PUBLIC_KEY,
            });
            if (live) setActivation(result);
          }
        }
      } catch {
        if (live) setError("Ative novamente com seu e-mail e código válido.");
      } finally {
        if (live) setReady(true);
      }
    }
    void load();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    function check() {
      if (activation?.expiresAt && activation.expiresAt <= Date.now()) {
        setActivation(null);
        setError(
          "Sua ativação expirou. Solicite um novo código ao administrador.",
        );
      }
    }
    const timer = setInterval(check, 30000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [activation]);
  async function activate(email: string, code: string) {
    let result: Activation;
    try {
      result = verifyActivation({ email, code, publicKey: PUBLIC_KEY });
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
    try {
      if (Platform.OS !== "web")
        await SecureStore.setItemAsync(
          KEY,
          JSON.stringify({
            email: result.email,
            code: code.replace(/\s/g, ""),
          }),
          { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
        );
    } catch {
      setError(
        "Não foi possível guardar sua ativação neste aparelho. Tente novamente.",
      );
      return false;
    }
    setActivation(result);
    setError("");
    return true;
  }
  async function signOut() {
    try {
      if (Platform.OS !== "web") await SecureStore.deleteItemAsync(KEY);
      setActivation(null);
      setError("");
      return true;
    } catch {
      setError("Não foi possível sair. Tente novamente.");
      return false;
    }
  }
  return (
    <Context.Provider
      value={{
        activation,
        ready,
        configured: !!PUBLIC_KEY,
        error,
        activate,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useActivation() {
  const c = useContext(Context);
  if (!c) throw new Error("ActivationProvider ausente.");
  return c;
}
