import React, { ReactNode } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, {
  Circle,
  Ellipse,
  Path,
  G,
  Polyline,
  Line,
} from "react-native-svg";
import { C, s, serif } from "./theme";
import { useStore } from "../state/store";
export function Icon({
  name,
  size = 20,
  color = C.ink,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  size?: number;
  color?: string;
}) {
  return <Feather name={name} size={size} color={color} />;
}
export function IconButton({
  name,
  onPress,
  label,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={s.iconButton}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Button({
  children,
  onPress,
  light = false,
  disabled = false,
}: {
  children: ReactNode;
  onPress: () => void;
  light?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        light && { backgroundColor: "#E8EEDB" },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[s.buttonText, light && { color: C.ink }]}>{children}</Text>
    </Pressable>
  );
}
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[s.chip, active && s.chipActive]}
    >
      <Text style={[s.chipText, active && { color: "white" }]}>{label}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  numeric = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  placeholder?: string;
}) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={s.input}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "decimal-pad" : "default"}
        placeholder={placeholder}
        placeholderTextColor="#9DA498"
      />
    </View>
  );
}
export function Header({
  title = "nutria",
  back = false,
}: {
  title?: string;
  back?: boolean;
}) {
  return (
    <View
      style={[
        s.between,
        {
          paddingHorizontal: 22,
          paddingVertical: 14,
          width: "100%",
          maxWidth: 650,
          alignSelf: "center",
        },
      ]}
    >
      <View style={s.row}>
        {back ? (
          <IconButton
            name="arrow-left"
            label="Voltar"
            onPress={() => router.back()}
          />
        ) : (
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              backgroundColor: C.green,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="feather" color={C.lime} size={19} />
          </View>
        )}
        <Text
          style={{
            fontFamily: serif,
            fontSize: 28,
            color: C.ink,
            letterSpacing: -1,
          }}
        >
          {title}
        </Text>
      </View>
      {!back && (
        <IconButton
          name="user"
          label="Abrir meu perfil"
          onPress={() => router.push("/profile")}
        />
      )}
    </View>
  );
}
export function Page({
  children,
  title,
  back = false,
}: {
  children: ReactNode;
  title?: string;
  back?: boolean;
}) {
  const { error } = useStore();
  return (
    <SafeAreaView edges={["top"]} style={s.page}>
      <Header title={title} back={back} />
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { error } = useStore();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.modalRoot}
      >
        <View style={[s.sheet, { paddingBottom: insets.bottom }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.sheetContent}
          >
            <View style={s.between}>
              <Text style={[s.h2, { flex: 1 }]}>{title}</Text>
              <IconButton name="x" label="Fechar" onPress={onClose} />
            </View>
            {error ? (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            ) : null}
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Section({
  title,
  caption,
  action,
  onPress,
}: {
  title: string;
  caption?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.between}>
      <View style={{ flex: 1 }}>
        <Text style={s.h2}>{title}</Text>
        {caption && <Text style={[s.small, { marginTop: 4 }]}>{caption}</Text>}
      </View>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ paddingVertical: 12 }}
        >
          <Text style={s.link}>{action} →</Text>
        </Pressable>
      )}
    </View>
  );
}
export function FoodArt({
  kind = "green",
  size = 140,
}: {
  kind?: string;
  size?: number;
}) {
  const palette =
    kind === "fruit"
      ? ["#D16F5B", "#E7B37E", "#769D53"]
      : kind === "breakfast"
        ? ["#D4B78E", "#C66567", "#8EA657"]
        : kind === "protein"
          ? ["#D59069", "#D8B66E", "#71944A"]
          : ["#86A65C", "#DFC276", "#C66C55"];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      accessibilityLabel="Ilustração de uma refeição"
    >
      <Circle cx="92" cy="97" r="73" fill="#173E3210" />
      <Circle cx="88" cy="88" r="71" fill="#F7F5E9" />
      <Circle cx="88" cy="88" r="59" fill="#E7E5D6" />
      <Circle cx="88" cy="88" r="54" fill="#F0E9D3" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <Ellipse
            key={i}
            cx={88 + Math.cos(a) * 31}
            cy={88 + Math.sin(a) * 31}
            rx="15"
            ry="24"
            transform={`rotate(${i * 45} ${88 + Math.cos(a) * 31} ${88 + Math.sin(a) * 31})`}
            fill={palette[i % 3]}
          />
        );
      })}
      <Path
        d="M62 76 Q90 56 115 75 L109 103 Q89 114 66 99Z"
        fill={kind === "protein" ? "#D69572" : "#ABC378"}
      />
      <Path
        d="M71 76 L70 97 M81 73 L80 102 M93 73 L91 103 M104 77 L101 99"
        stroke="#FFF8"
        strokeWidth="2"
      />
      {[
        [55, 65],
        [118, 105],
        [75, 120],
        [117, 64],
        [54, 105],
        [96, 50],
      ].map(([x, y], i) => (
        <G key={i}>
          <Circle cx={x} cy={y} r="5" fill={palette[(i + 1) % 3]} />
          <Circle cx={x - 1} cy={y - 1} r="1.5" fill="#FFF7" />
        </G>
      ))}
      <Path d="M84 79Q93 58 103 68Q109 81 84 79" fill="#416B3E" />
      <Path d="M84 79L102 68" stroke="#A9C785" strokeWidth="1.5" />
    </Svg>
  );
}
export function Ring({
  value,
  max,
  size = 190,
  label,
  sub,
}: {
  value: number;
  max: number;
  size?: number;
  label: string;
  sub?: string;
}) {
  const radius = 76,
    circ = 2 * Math.PI * radius,
    progress = Math.max(0, Math.min(1, value / Math.max(1, max)));
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 180 180"
        style={{ position: "absolute" }}
      >
        <Circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="#FFFFFF24"
          strokeWidth="8"
        />
        <Circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={C.lime}
          strokeWidth="8"
          strokeDasharray={`${circ * progress} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
        />
      </Svg>
      <Text style={{ fontSize: 11, color: "#DCE9D3" }}>
        {sub || "RESTANTES"}
      </Text>
      <Text
        style={{
          fontSize: 42,
          fontFamily: serif,
          color: "white",
          marginVertical: 3,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 11, color: "#DCE9D3" }}>kcal</Text>
    </View>
  );
}
export function WeightChart({
  entries,
}: {
  entries: { date: string; value: number }[];
}) {
  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);
  if (!rows.length)
    return (
      <Text style={s.body}>Seu gráfico começa com o primeiro registro.</Text>
    );
  const values = rows.map((x) => x.value),
    low = Math.min(...values) - 1,
    high = Math.max(...values) + 1;
  const points = rows.map(
    (r, i) =>
      `${rows.length === 1 ? 150 : 20 + (i * 260) / (rows.length - 1)},${125 - ((r.value - low) / (high - low)) * 100}`,
  );
  return (
    <View>
      <Svg width="100%" height={155} viewBox="0 0 300 150">
        <Line x1="15" y1="125" x2="285" y2="125" stroke={C.line} />
        <Line x1="15" y1="75" x2="285" y2="75" stroke={C.line} />
        <Polyline
          points={points.join(" ")}
          stroke={C.green}
          strokeWidth="3"
          fill="none"
        />
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={+p.split(",")[0]}
            cy={+p.split(",")[1]}
            r="4"
            fill={C.green}
          />
        ))}
      </Svg>
      <View style={s.between}>
        <Text style={s.small}>
          {rows[0].date.split("-").reverse().slice(0, 2).join("/")}
        </Text>
        <Text style={s.small}>
          {rows[rows.length - 1].date
            .split("-")
            .reverse()
            .slice(0, 2)
            .join("/")}
        </Text>
      </View>
    </View>
  );
}
