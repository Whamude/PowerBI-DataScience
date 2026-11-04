import english from "./en.mjs";

export const LANGUAGE_KEY = "nutria.language.v1";
export const LANGUAGES = ["pt", "en"];
let current = "pt";
export function setCurrentLanguage(value) {
  if (!LANGUAGES.includes(value)) throw Error("Unsupported language");
  current = value;
}
export const getLanguage = () => current;
export const locale = () => (current === "en" ? "en-US" : "pt-BR");
export function num(value, options = {}) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(locale(), {
        maximumFractionDigits: 3,
        ...options,
      }).format(number)
    : String(value ?? "");
}
export function numberInput(value) {
  if (value === null || value === undefined || String(value).trim() === "")
    return "";
  return num(value, { useGrouping: false, maximumFractionDigits: 20 });
}
export function inputNumber(value) {
  let text = String(value).trim();
  if (current === "pt") {
    if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
    else if (/^[+-]?\d{1,3}(\.\d{3})+$/.test(text))
      text = text.replace(/\./g, "");
  } else if (text.includes(".") || /^[+-]?\d{1,3}(,\d{3})+$/.test(text)) {
    text = text.replace(/,/g, "");
  } else text = text.replace(",", ".");
  return text;
}
function fill(text, params) {
  return text.replace(/\{(\d+)\}/g, (all, key) =>
    params[key] === undefined ? all : String(params[key]),
  );
}
export function tr(source, params = {}) {
  if (source === null || source === undefined) return "";
  const text = String(source);
  const bounds =
    !text.includes("{") &&
    text.match(/^(.+): informe um valor entre (.+) e (.+)\.$/);
  if (bounds)
    return tr("{0}: informe um valor entre {1} e {2}.", {
      0: tr(bounds[1]),
      1: num(bounds[2]),
      2: num(bounds[3]),
    });
  if (current === "pt") return fill(text, params);
  if (Object.hasOwn(english, text)) return fill(english[text], params);
  const trimmed = text.trim();
  if (trimmed && Object.hasOwn(english, trimmed))
    return (
      text.slice(0, text.indexOf(trimmed)) +
      fill(english[trimmed], params) +
      text.slice(text.indexOf(trimmed) + trimmed.length)
    );
  // Domain errors stay canonical in storage/state and are translated at display time.
  const meta = text.split(" · ");
  if (meta.length > 1 && meta.some((part) => Object.hasOwn(english, part)))
    return meta.map((part) => tr(part)).join(" · ");
  return text;
}
export function nutritionText(text) {
  if (current === "pt") return text;
  return String(text)
    .replace(/VALOR NUTRICIONAL/g, "NUTRITION VALUE")
    .replace(/Calorias/g, "Calories")
    .replace(/calorias/g, "calories")
    .replace(/Carboidratos?/g, "Carbohydrates")
    .replace(/Proteínas?/g, "Protein")
    .replace(/Gorduras?/g, "Fat")
    .replace(/\d+(?:\.\d{3})*(?:,\d+)?/g, (value) =>
      num(Number(value.replace(/\./g, "").replace(",", "."))),
    );
}
