import { tr } from "../../i18n/core.mjs";
import { useLanguage } from "../../i18n/LanguageProvider";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useStore } from "../../state/store";
import { useActivation } from "../../auth/ActivationProvider";
import { Page, Button, Icon } from "../../ui/components";
import { s, C } from "../../ui/theme";
export default function Restore() {
  useLanguage();
  const { legacyAvailable, importLegacy, skipLegacy, ready } = useStore();
  const { activation } = useActivation();
  const [busy, setBusy] = useState(false);
  if (ready && !legacyAvailable) return <Redirect href="/" />;
  async function choose(importData: boolean) {
    setBusy(true);
    const ok = await (importData ? importLegacy() : skipLegacy());
    setBusy(false);
    if (ok) router.replace("/");
  }
  return (
    <Page title={tr("Seus registros")}>
      <View style={[s.card, { backgroundColor: "#E6EDD8" }]}>
        <Icon name="archive" size={36} color={C.green} />
        <Text style={s.title}>{tr("Vamos preservar\nsua história.")}</Text>
        <Text style={s.body}>
          {tr(
            "Encontramos registros de uma versão anterior neste aparelho. Eles ainda não estão associados a um e-mail.",
          )}
        </Text>
      </View>
      <Text style={s.body}>
        {tr("Se esses registros são seus, você pode associá-los a ")}
        {activation?.email}
        {tr(
          ". Depois da associação, outra ativação neste aparelho não poderá importar o mesmo backup.",
        )}
      </Text>
      <Button disabled={busy} onPress={() => void choose(true)}>
        {busy ? tr("Aguarde…") : tr("Associar meus registros a este e-mail")}
      </Button>
      <Button disabled={busy} light onPress={() => void choose(false)}>
        {tr("Começar sem importar")}
      </Button>
      <Text style={s.small}>
        {tr(
          "O backup anterior será preservado em ambos os casos. Não importe registros que pertençam a outra pessoa.",
        )}
      </Text>
    </Page>
  );
}
