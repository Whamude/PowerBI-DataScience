import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createTrial,
  createGuestTrial,
  bindGuestTrial,
  checkTrial,
  resumeTrial,
} from "./trial.mjs";
import config from "./activation-config.json";
import { verifyActivation, accountId as emailAccountId } from "./license.mjs";
export type Activation = {
  trial?: boolean;
  guest?: boolean;
  email: string;
  accountId: string;
  licenseId: string;
  expiresAt: number | null;
  issuedAt: number;
};
const PUBLIC_KEY =
  process.env.EXPO_PUBLIC_ACTIVATION_PUBLIC_KEY || config.publicKey;
const TRIAL_KEY = "nutria.trial.v1";
async function readTrial() {
  return Platform.OS === "web"
    ? AsyncStorage.getItem(TRIAL_KEY)
    : SecureStore.getItemAsync(TRIAL_KEY);
}
async function writeTrial(
  record: ReturnType<typeof createTrial> | ReturnType<typeof createGuestTrial>,
) {
  const raw = JSON.stringify(record);
  if (Platform.OS === "web") await AsyncStorage.setItem(TRIAL_KEY, raw);
  else
    await SecureStore.setItemAsync(TRIAL_KEY, raw, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
}
const KEY = "nutria.activation.v1";
type Value = {
  activation: Activation | null;
  ready: boolean;
  configured: boolean;
  error: string;
  activate: (email: string, code: string) => Promise<boolean>;
  startTrial: (email: string) => Promise<boolean>;
  startGuest: () => Promise<boolean>;
  registerGuest: (
    email: string,
    prepare: (accountId: string) => Promise<void>,
  ) => Promise<boolean>;
  signOut: () => Promise<boolean>;
};
const Context = createContext<Value | null>(null);
export function ActivationProvider({ children }: { children: ReactNode }) {
  const [activation, setActivation] = useState<Activation | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const operation = useRef(false);
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        let licensed = false;
        if (Platform.OS !== "web") {
          const raw = await SecureStore.getItemAsync(KEY);
          if (raw) {
            try {
              const result = verifyActivation({
                ...JSON.parse(raw),
                publicKey: PUBLIC_KEY,
              });
              if (live) setActivation(result);
              licensed = true;
            } catch {
              if (live)
                setError(
                  "Sua ativação não é válida. Informe um código válido para continuar.",
                );
              return;
            }
          }
        }
        if (!licensed) {
          let raw = await readTrial();
          if (!raw) {
            const guest = createGuestTrial();
            await writeTrial(guest);
            raw = JSON.stringify(guest);
          }
          if (raw) {
            const result = checkTrial(JSON.parse(raw));
            await writeTrial(result.record);
            if (live && !result.record.signedOut)
              setActivation(result.activation);
            if (live && !result.activation)
              setError(
                "Seu teste de 7 dias terminou. Ative com seu e-mail e código para continuar; seus registros estão preservados.",
              );
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
    let live = true;
    async function check() {
      if (operation.current) return;
      operation.current = true;
      try {
        if (activation?.trial) {
          const raw = await readTrial();
          if (!raw) throw new Error();
          const result = checkTrial(JSON.parse(raw));
          await writeTrial(result.record);
          if (live && !result.activation) {
            setActivation(null);
            setError(
              "Seu teste de 7 dias terminou. Ative com seu e-mail e código para continuar; seus registros estão preservados.",
            );
          }
        } else if (
          activation?.expiresAt &&
          activation.expiresAt <= Date.now()
        ) {
          if (live) {
            setActivation(null);
            setError(
              "Sua ativação expirou. Solicite um novo código ao administrador.",
            );
          }
        }
      } catch {
        if (live) {
          setActivation(null);
          setError(
            "Não foi possível verificar o teste. Use seu código de ativação ou tente novamente.",
          );
        }
      } finally {
        operation.current = false;
      }
    }
    const timer = setInterval(check, 30000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => {
      live = false;
      clearInterval(timer);
      sub.remove();
    };
  }, [activation]);
  async function activate(email: string, code: string) {
    if (operation.current) return false;
    let result: Activation;
    try {
      result = verifyActivation({ email, code, publicKey: PUBLIC_KEY });
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
    operation.current = true;
    try {
      const trialRaw = await readTrial();
      let trialRecord = createTrial(result.email);
      if (trialRaw) {
        try {
          trialRecord = checkTrial(JSON.parse(trialRaw)).record;
        } catch {
          /* A valid signed activation can recover damaged trial metadata. */
        }
      }
      if (Platform.OS !== "web")
        await SecureStore.setItemAsync(
          KEY,
          JSON.stringify({
            email: result.email,
            code: code.replace(/\s/g, ""),
          }),
          { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
        );
      await writeTrial({ ...trialRecord, ended: true });
    } catch {
      setError(
        "Não foi possível guardar sua ativação neste aparelho. Tente novamente.",
      );
      return false;
    } finally {
      operation.current = false;
    }
    setActivation(result);
    setError("");
    return true;
  }
  async function startGuest() {
    if (operation.current) return false;
    operation.current = true;
    try {
      const raw = await readTrial();
      const record = raw ? JSON.parse(raw) : createGuestTrial();
      if (record.version !== 2) return false;
      const result = checkTrial(record);
      await writeTrial(result.record);
      if (!result.activation) return false;
      await writeTrial({ ...result.record, signedOut: false });
      setActivation(result.activation);
      setError("");
      return true;
    } catch {
      setError("Não foi possível iniciar o teste. Tente novamente.");
      return false;
    } finally {
      operation.current = false;
    }
  }
  async function registerGuest(
    email: string,
    prepare: (accountId: string) => Promise<void>,
  ) {
    if (operation.current) return false;
    operation.current = true;
    try {
      const raw = await readTrial();
      if (!raw || !activation?.guest) return false;
      const bound = bindGuestTrial(JSON.parse(raw), email);
      const id = emailAccountId(bound.email);
      // Save the requested record before switching the account namespace.
      await prepare(id);
      const checked = checkTrial(bound);
      if (!checked.activation)
        throw new Error(
          "Seu teste de 7 dias terminou. Ative com seu e-mail e código para continuar; seus registros estão preservados.",
        );
      await writeTrial(checked.record);
      setActivation(checked.activation);
      setError("");
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar. Tente novamente; seu último registro salvo foi preservado.",
      );
      return false;
    } finally {
      operation.current = false;
    }
  }
  async function startTrial(email: string) {
    if (operation.current) return false;
    operation.current = true;
    try {
      const raw = await readTrial();
      const saved = raw ? JSON.parse(raw) : createTrial(email);
      // Persist expiry even when resuming is rejected. Never replace an existing start time.
      const checked = checkTrial(saved);
      await writeTrial(checked.record);
      const result = resumeTrial(checked.record, email);
      await writeTrial(result.record);
      if (Platform.OS !== "web") await SecureStore.deleteItemAsync(KEY);
      setActivation(result.activation);
      setError("");
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível iniciar o teste. Tente novamente.",
      );
      return false;
    } finally {
      operation.current = false;
    }
  }
  async function signOut() {
    if (operation.current) return false;
    operation.current = true;
    try {
      if (activation?.trial) {
        const raw = await readTrial();
        if (!raw) throw new Error();
        const result = checkTrial(JSON.parse(raw));
        await writeTrial({ ...result.record, signedOut: true });
      }
      if (Platform.OS !== "web") await SecureStore.deleteItemAsync(KEY);
      setActivation(null);
      setError("");
      return true;
    } catch {
      setError("Não foi possível sair. Tente novamente.");
      return false;
    } finally {
      operation.current = false;
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
        startTrial,
        startGuest,
        registerGuest,
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
