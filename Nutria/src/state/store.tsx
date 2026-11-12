import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { router } from "expo-router";
import { useActivation } from "../auth/ActivationProvider";
import { RegistrationSheet } from "../auth/RegistrationSheet";
import {
  dateKey,
  emptyDay,
  initialData,
  migrateLegacy,
  validateData,
} from "../domain/model.mjs";
export type Meal = {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  group: string;
  grams?: number;
  sourceFoodId?: string;
  sourceRecipeId?: string;
  sourceServings?: number;
  portionNote?: string;
};
export type Day = {
  meals: Meal[];
  water: number;
  fruit: number;
  vegetables: number;
  activities: { id: string; name: string; minutes: number; kcal: number }[];
};
export type Profile = {
  name: string;
  goal: string;
  style: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  targetWeight: number;
};
export type Data = {
  version: number;
  onboarded: boolean;
  profile: Profile;
  days: Record<string, Day>;
  weights: { date: string; value: number }[];
  favorites: string[];
  recipeFavorites: string[];
  plan: string;
  shopping: string[];
};
const LEGACY_KEY = "nutria:state:v2";
const LEGACY_OWNER = "nutria:legacy-owner:v1";
type Store = {
  data: Data;
  ready: boolean;
  error: string;
  selected: string;
  setSelected: (date: string) => void;
  mutate: (fn: (d: Data) => Data) => Promise<boolean>;
  updateDay: (fn: (d: Day) => Day) => Promise<boolean>;
  today: string;
  legacyAvailable: boolean;
  requestRegistration: (purchase?: boolean) => void;
  importLegacy: () => Promise<boolean>;
  skipLegacy: () => Promise<boolean>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({
  children,
  accountId,
}: {
  children: ReactNode;
  accountId: string;
}) {
  if (!/^[a-f0-9]{64}$/.test(accountId))
    throw new Error("Conta de ativação inválida.");
  const {
    activation,
    registerGuest,
    error: registrationError,
  } = useActivation();
  const guest = !!activation?.guest;
  const [registration, setRegistration] = useState(false);
  const [registrationPurchase, setRegistrationPurchase] = useState(false);
  const pending = useRef<{ fn?: (d: Data) => Data; purchase?: boolean }>({});
  const KEY = `nutria:account:${accountId}:v2`;
  const CHOICE = `nutria:account:${accountId}:legacy-choice`;
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [data, setData] = useState<Data>(initialData() as Data),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [today, setToday] = useState(dateKey()),
    [selected, setSelected] = useState(dateKey());
  const current = useRef(data),
    queue = useRef(Promise.resolve()),
    lastToday = useRef(today);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (guest) {
          const next = { ...initialData(), onboarded: true } as Data;
          if (active) {
            current.current = next;
            setData(next);
            setReady(true);
          }
          return;
        }
        const raw = await AsyncStorage.getItem(KEY);
        let next: Data;
        if (raw) next = validateData(JSON.parse(raw));
        else next = initialData() as Data;
        const owner = await AsyncStorage.getItem(LEGACY_OWNER),
          choice = await AsyncStorage.getItem(CHOICE);
        if ((!owner || owner === accountId) && !choice && !raw) {
          const previous = await AsyncStorage.getItem(LEGACY_KEY);
          const oldKeys = (await AsyncStorage.getAllKeys()).filter((k) =>
            k.startsWith("nutria:day:"),
          );
          if (active) setLegacyAvailable(!!previous || oldKeys.length > 0);
        }
        if (active) {
          current.current = next;
          setData(next);
          setReady(true);
        }
      } catch {
        if (active)
          setError(
            "Não foi possível ler os dados locais. Feche e reabra o aplicativo. Seus registros não foram apagados.",
          );
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [KEY, CHOICE, accountId, guest]);
  useEffect(() => {
    const refresh = () => {
      const now = dateKey();
      if (now !== lastToday.current) {
        const previous = lastToday.current;
        setSelected((s) => (s === previous ? now : s));
        lastToday.current = now;
        setToday(now);
      }
    };
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    const timer = setInterval(refresh, 30000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  async function mutate(fn: (d: Data) => Data) {
    let ok = false;
    queue.current = queue.current.then(async () => {
      try {
        if (!ready) return;
        const next = fn(current.current);
        if (
          guest &&
          (next.days !== current.current.days ||
            next.weights !== current.current.weights)
        ) {
          pending.current = { fn };
          setRegistrationPurchase(false);
          setRegistration(true);
          return;
        }
        if (!guest) await AsyncStorage.setItem(KEY, JSON.stringify(next));
        current.current = next;
        setData(next);
        setError("");
        ok = true;
      } catch {
        setError(
          "Não foi possível salvar. Tente novamente; seu último registro salvo foi preservado.",
        );
      }
    });
    await queue.current;
    return ok;
  }
  function requestRegistration(purchase = false) {
    if (!guest) {
      if (purchase) router.push("/purchase");
      return;
    }
    pending.current = { purchase };
    setRegistrationPurchase(purchase);
    setRegistration(true);
  }
  async function completeRegistration(email: string, name: string) {
    const request = pending.current;
    const ok = await registerGuest(email, async (id) => {
      const key = `nutria:account:${id}:v2`;
      const raw = await AsyncStorage.getItem(key);
      // Existing email records win over temporary visitor preferences.
      let next = raw
        ? (validateData(JSON.parse(raw)) as Data)
        : current.current;
      if (!raw) next = { ...next, profile: { ...next.profile, name } };
      if (request.fn) next = request.fn(next);
      await AsyncStorage.setItem(key, JSON.stringify(validateData(next)));
    });
    if (ok) {
      pending.current = {};
      setRegistration(false);
      if (request.purchase) router.replace("/purchase");
    }
    return ok;
  }
  async function importLegacy() {
    if (!ready || !legacyAvailable) return false;
    let ok = false;
    queue.current = queue.current.then(async () => {
      try {
        const owner = await AsyncStorage.getItem(LEGACY_OWNER);
        if (owner && owner !== accountId)
          throw new Error("Registros já associados a outra conta.");
        const raw = await AsyncStorage.getItem(LEGACY_KEY);
        const keys = (await AsyncStorage.getAllKeys()).filter((k) =>
          k.startsWith("nutria:day:"),
        );
        const next: Data = raw
          ? validateData(JSON.parse(raw))
          : (migrateLegacy(await AsyncStorage.multiGet(keys)) as Data);
        await AsyncStorage.setItem(LEGACY_OWNER, accountId);
        await AsyncStorage.setItem(KEY, JSON.stringify(next));
        await AsyncStorage.setItem(CHOICE, "import");
        current.current = next;
        setData(next);
        setLegacyAvailable(false);
        setError("");
        ok = true;
      } catch {
        setError(
          "Não foi possível importar os registros anteriores. O backup original foi preservado.",
        );
      }
    });
    await queue.current;
    return ok;
  }
  async function skipLegacy() {
    try {
      await AsyncStorage.setItem(CHOICE, "skip");
      setLegacyAvailable(false);
      return true;
    } catch {
      setError("Não foi possível salvar sua escolha. Tente novamente.");
      return false;
    }
  }
  function updateDay(fn: (day: Day) => Day) {
    const date = selected;
    return mutate((d) => ({
      ...d,
      days: { ...d.days, [date]: fn(d.days[date] || emptyDay()) },
    }));
  }
  return (
    <Context.Provider
      value={{
        data,
        ready,
        error,
        selected,
        setSelected,
        mutate,
        updateDay,
        today,
        legacyAvailable,
        requestRegistration,
        importLegacy,
        skipLegacy,
      }}
    >
      {children}
      {registration && (
        <RegistrationSheet
          visible={registration}
          purchase={registrationPurchase}
          error={registrationError}
          onClose={() => {
            pending.current = {};
            setRegistration(false);
          }}
          onRegister={completeRegistration}
        />
      )}
    </Context.Provider>
  );
}
export function useStore() {
  const c = useContext(Context);
  if (!c) throw new Error("StoreProvider ausente");
  return c;
}
