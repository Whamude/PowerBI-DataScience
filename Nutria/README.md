> **Ativação por e-mail configurada no código:** chave pública do proprietário `cfae2c592dc713e9` aplicada à versão 0.4. O APK 0.4 foi compilado com sucesso: [baixar APK](https://expo.dev/artifacts/eas/iJMrdMlhw-WaTzUH7CYBtm8GNUAUtvrmE1FUonW_IBU.apk). Veja [o registro do build](docs/08-build-04.md). Para emitir códigos, use [o gerador offline](tools/Nutria-Gerador-Ativacao.zip) e [as instruções](tools/LEIA-ME-ATIVACAO.txt).
>
> Para continuar em outra conta GPT: [COMECAR-AQUI.md](COMECAR-AQUI.md) e [backup da preparação 0.4](backup/Nutria-0.4-preparacao.zip). A [versão 0.3 anterior](backup/Nutria-0.3-projeto.zip) foi preservada.

# Nutria 0.4 — ativação por e-mail

**APK 0.4.0 compilado no Expo/EAS, com versionCode 4 e a chave pública real do proprietário. Instale como atualização da 0.3, sem desinstalar para preservar seus registros. A versão 0.4 exige ativação individual por e-mail.**

O gerador offline está em tools/gerador-ativacao.html. Leia tools/LEIA-ME-ATIVACAO.txt e docs/07-ativacao-email.md. Gere a chave no seu computador e forneça somente a pública. Nunca enviar a chave privada protegida nem sua senha ao chat, Git ou APK.

A ativação usa código Ed25519 individual para cada e-mail. Não há senha mestra ou servidor obrigatório. Rotas privadas são protegidas, a sessão nativa usa SecureStore e registros são separados por e-mail. Os testes e limites estão em docs/07-ativacao-email.md.

## Funcionalidades preservadas da versão 0.3

Aplicativo Android/iOS em Expo SDK 58. Esta é uma entrega integrada em evolução, não um produto final com todos os serviços da referência.

## Funcionalidades

- Configuração inicial de nome, objetivo, preferências, metas e peso opcional.
- Navegação real em cinco áreas: Diário, Evolução, Planos, Receitas e Perfil.
- Diário por data e refeição; registro manual ou catálogo local de 24 alimentos, porções em gramas, favoritos, recentes, edição e exclusão.
- Calorias e macronutrientes calculados a partir dos registros; metas editáveis.
- Água, contadores de frutas/vegetais e atividades informadas pelo usuário.
- Histórico de peso, gráfico, resumo de 7 dias e sequências de dias registrados.
- 105 receitas: 97 dos PDFs corrigidos, com fotos e atribuição, mais as oito receitas Nutria. Busca por ingredientes, filtros, favoritos e detalhes; as receitas originais mantêm porções ajustáveis.
- Três coleções de receitas, com seleção e checklist persistente de ingredientes.
- Exportação de registros pelo compartilhamento nativo.
- Persistência local serializada e migração dos dados do APK anterior, sem apagar o backup original.

Valores do catálogo e das oito receitas Nutria são indicativos. Os 24 quadros nutricionais dos PDFs são exibidos como transcrição da fonte, sem presumir porção nem inventar valores ausentes. As receitas importadas exigem nutrientes informados pelo usuário para registrar uma porção no diário. Não há base alimentar comercial ou verificada por marca nesta entrega.

## Desenvolvimento

Use o checkout existente em /workspace/PowerBI-DataScience/Nutria. Não crie worktrees para iniciar este projeto.

```sh
cd /workspace/PowerBI-DataScience/Nutria
npm ci
npm start
npm run lint
npm run typecheck
npm test
EXPO_OFFLINE=1 npx expo export --platform all
```

## Testes de interface da ativação

Use os comandos de docs/07-ativacao-email.md com uma chave pública descartável de testes e o servidor web na porta 8082. Os testes atuais são browser-activation.cjs, browser-generator.cjs e browser-flows.cjs. Os demais scripts de navegador são registros históricos da versão 0.3 e não incluem a nova etapa de ativação.

## Android

```sh
npx eas-cli@latest build --platform android --profile preview
```

Perfil preview produz APK autônomo para celulares ARM de 32 e 64 bits. O projeto EAS e a chave gerenciada são preservados para atualizar a instalação anterior. versionCode=4 para a versão 0.4. Arquiteturas x86 de emuladores não são alvos deste APK. O perfil production produz AAB para loja.

## Limites desta entrega

Não há IA, scanner de código de barras, login, sincronização, Health Connect/HealthKit, assinaturas ou notificações. Dados permanecem no aparelho, sem criptografia própria nem backup automático. Não houve testes físicos em Android ou iPhone. Não publicar como produto de saúde final sem revisão de privacidade, dados nutricionais e testes em dispositivos.

Veja docs/03-capturas-e-reformulacao.md para rastreabilidade entre referência e implementação.

A integração dos PDFs está documentada em docs/05-receitas-pdfs.md. O APK Android 0.4 usa versionCode 4 e as credenciais de assinatura gerenciadas existentes. Consulte docs/08-build-04.md.
