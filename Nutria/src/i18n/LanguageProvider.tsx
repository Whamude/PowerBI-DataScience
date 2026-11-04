import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { LANGUAGE_KEY, LANGUAGES, setCurrentLanguage, tr } from "./core.mjs";
import { C, s } from "../ui/theme";

type Language = "pt" | "en";
type LanguageState = {
  language: Language;
  changeLanguage: (next: Language) => Promise<boolean>;
  saving: boolean;
  error: string;
};
const Context = createContext<LanguageState | null>(null);
export function useLanguage() {
  const value = useContext(Context);
  if (!value) throw Error("LanguageProvider missing");
  return value;
}
export function LanguagePicker() {
  const { language, changeLanguage, saving, error } = useLanguage();
  const choices = useRef<
    Partial<Record<Language, React.ElementRef<typeof Pressable>>>
  >({});
  return (
    <View style={[s.card, { gap: 12 }]}>
      <Text style={s.h3}>{tr("Idioma")}</Text>
      <Text style={s.small}>
        {tr(
          "Escolha o idioma do aplicativo. Seus registros e o prazo do teste serão preservados.",
        )}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={tr("Idioma")}
        style={[s.row, { flexWrap: "wrap" }]}
      >
        {(["pt", "en"] as const).map((value) => (
          <Pressable
            key={value}
            ref={(node) => {
              if (node) choices.current[value] = node;
              else delete choices.current[value];
            }}
            {...(Platform.OS === "web"
              ? {
                  onKeyDown: (
                    event: Parameters<
                      NonNullable<
                        React.ComponentProps<typeof Pressable>["onKeyDown"]
                      >
                    >[0],
                  ) => {
                    if (saving) return;
                    // This handler is attached only on web, which provides a DOM keyboard event.
                    const key = (event as unknown as { key: string }).key;
                    if (key === " ") {
                      event.preventDefault();
                      void changeLanguage(value);
                    } else if (
                      [
                        "ArrowLeft",
                        "ArrowRight",
                        "ArrowUp",
                        "ArrowDown",
                      ].includes(key)
                    ) {
                      event.preventDefault();
                      const next = value === "pt" ? "en" : "pt";
                      choices.current[next]?.focus();
                      void changeLanguage(next);
                    }
                  },
                }
              : {})}
            accessibilityRole="radio"
            accessibilityLabel={value === "pt" ? "Português" : "English"}
            accessibilityState={{
              checked: language === value,
              disabled: saving,
            }}
            aria-checked={language === value}
            disabled={saving}
            onPress={() => void changeLanguage(value)}
            style={[
              s.chip,
              {
                minHeight: 44,
                minWidth: 100,
                alignItems: "center",
                justifyContent: "center",
              },
              language === value && { backgroundColor: C.green },
            ]}
          >
            <Text style={{ color: language === value ? "white" : C.ink }}>
              {value === "pt" ? "Português" : "English"}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {tr(error)}
        </Text>
      ) : null}
    </View>
  );
}
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("pt");
  const [ready, setReady] = useState(false);
  const [chosen, setChosen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef(false);
  useEffect(() => {
    let live = true;
    void AsyncStorage.getItem(LANGUAGE_KEY)
      .then((saved) => {
        if (!live) return;
        if (saved && LANGUAGES.includes(saved)) {
          setCurrentLanguage(saved);
          setLanguage(saved as Language);
          setChosen(true);
        }
      })
      .catch(() => {
        if (live)
          setError(
            "Não foi possível ler o idioma salvo. Escolha o idioma novamente.",
          );
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);
  async function changeLanguage(next: Language) {
    if (operation.current || !LANGUAGES.includes(next)) return false;
    operation.current = true;
    setSaving(true);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, next);
      setCurrentLanguage(next);
      setLanguage(next);
      setChosen(true);
      setError("");
      return true;
    } catch {
      setError("Não foi possível salvar o idioma. Tente novamente.");
      return false;
    } finally {
      operation.current = false;
      setSaving(false);
    }
  }
  if (!ready)
    return (
      <View
        style={[s.page, { justifyContent: "center", alignItems: "center" }]}
      >
        <ActivityIndicator
          accessibilityLabel="Carregando / Loading"
          color={C.green}
        />
      </View>
    );
  return (
    <Context.Provider value={{ language, changeLanguage, saving, error }}>
      {chosen ? (
        children
      ) : (
        <SafeAreaView style={s.page}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              padding: 24,
              justifyContent: "center",
              gap: 24,
            }}
          >
            <Text style={s.title}>nutria.</Text>
            <Text style={s.h2}>Português / English</Text>
            <Text style={s.body}>
              Escolha seu idioma para começar.{"\n"}Choose your language to get
              started.
            </Text>
            <LanguagePicker />
          </ScrollView>
        </SafeAreaView>
      )}
    </Context.Provider>
  );
}
