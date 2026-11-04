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
  }, [KEY, CHOICE, accountId]);
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
        await AsyncStorage.setItem(KEY, JSON.stringify(next));
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
        importLegacy,
        skipLegacy,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const c = useContext(Context);
  if (!c) throw new Error("StoreProvider ausente");
  return c;
}
