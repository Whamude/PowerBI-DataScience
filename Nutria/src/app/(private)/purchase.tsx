import React from "react";
import { Text } from "react-native";
import { useActivation } from "../../auth/ActivationProvider";
import { useStore } from "../../state/store";
import { Page, Button } from "../../ui/components";
import { s } from "../../ui/theme";
import { tr } from "../../i18n/core.mjs";
import { useLanguage } from "../../i18n/LanguageProvider";
import Activate from "../activate";
export default function Purchase() {
  useLanguage();
  const { activation } = useActivation();
  const { requestRegistration } = useStore();
  if (activation?.guest)
    return (
      <Page back>
        <Text style={s.title}>{tr("Seu próximo passo")}</Text>
        <Text style={s.body}>
          {tr("Para comprar seu acesso, primeiro crie seu cadastro.")}
        </Text>
        <Button onPress={() => requestRegistration(true)}>
          {tr("Criar cadastro")}
        </Button>
      </Page>
    );
  return <Activate />;
}
