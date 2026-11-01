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
const KEY = "nutria:state:v2";
type Store = {
  data: Data;
  ready: boolean;
  error: string;
  selected: string;
  setSelected: (date: string) => void;
  mutate: (fn: (d: Data) => Data) => Promise<boolean>;
  updateDay: (fn: (d: Day) => Day) => Promise<boolean>;
  today: string;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
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
        else {
          const keys = (await AsyncStorage.getAllKeys()).filter((k) =>
            k.startsWith("nutria:day:"),
          );
          next = migrateLegacy(await AsyncStorage.multiGet(keys)) as Data;
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
  }, []);
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
