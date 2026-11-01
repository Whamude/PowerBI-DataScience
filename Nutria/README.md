> **Backup para continuar em outra conta GPT:** leia [COMECAR-AQUI.md](COMECAR-AQUI.md) e baixe [Nutria-0.3-projeto.zip](backup/Nutria-0.3-projeto.zip). O ZIP contém código, imagens, documentação e testes; não contém credenciais. Para o histórico integral da conversa, faça a exportação separadamente na conta de origem.

# Nutria 0.3 — receitas com fotos dos PDFs

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

Use o checkout existente em /workspace/Nutria. Não crie worktrees para iniciar este projeto.

```sh
cd /workspace/Nutria
npm ci
npm start
npm run lint
npm run typecheck
npm test
EXPO_OFFLINE=1 npx expo export --platform all
```

## Testes de interface

Testes em Chromium móvel (390 × 844). Requer servidor web local e Playwright; não instalar Playwright como dependência de produção.

```sh
npm install --prefix /tmp/nutria-browser playwright
EXPO_OFFLINE=1 npx expo start --web --port 8081
# Em outro terminal; ajuste executablePath nos scripts se Chromium estiver em outro local.
NODE_PATH=/tmp/nutria-browser/node_modules node tests/browser-flows.cjs
NODE_PATH=/tmp/nutria-browser/node_modules node tests/browser-migration.cjs
NODE_PATH=/tmp/nutria-browser/node_modules node tests/browser-storage.cjs
NODE_PATH=/tmp/nutria-browser/node_modules node tests/browser-imported-recipes.cjs
```

## Android

```sh
npx eas-cli@latest build --platform android --profile preview
```

Perfil preview produz APK autônomo para celulares ARM de 32 e 64 bits. O projeto EAS e a chave gerenciada são preservados para atualizar a instalação anterior. versionCode=3. Arquiteturas x86 de emuladores não são alvos deste APK. O perfil production produz AAB para loja.

## Limites desta entrega

Não há IA, scanner de código de barras, login, sincronização, Health Connect/HealthKit, assinaturas ou notificações. Dados permanecem no aparelho, sem criptografia própria nem backup automático. Não houve testes físicos em Android ou iPhone. Não publicar como produto de saúde final sem revisão de privacidade, dados nutricionais e testes em dispositivos.

Veja docs/03-capturas-e-reformulacao.md para rastreabilidade entre referência e implementação.

A integração dos PDFs está documentada em docs/05-receitas-pdfs.md. O build Android 0.3 usa versionCode 3 e a mesma chave gerenciada.
