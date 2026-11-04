# Nutria 0.7 — Português / English e teste experimental de 7 dias

Escolha Português ou English no primeiro uso e altere a preferência no Perfil ou na tela de ativação. A escolha é salva neste aparelho e atualiza a interface, alimentos, 105 receitas, datas e números. Textos livres, nomes próprios e registros existentes são preservados. Consulte [docs/10-idiomas.md](docs/10-idiomas.md).

Novos usuários podem informar o e-mail e iniciar 168 horas de uso sem código de ativação. O prazo começa ao tocar em **Começar ou retomar teste de 7 dias**, continua com o app fechado e não reinicia ao sair, reabrir ou trocar de e-mail. Um único teste é permitido por instalação.

Ao vencer, o aplicativo solicita o código individual. Ativar com o mesmo e-mail mantém o diário e as preferências. O Perfil mostra quando o teste termina e permite sair para inserir o código antes do vencimento.

A chave pública de produção `9def3ab908ff7344` já está configurada. A versão 0.7 usa versionCode 7 e requer um novo APK. O gerador offline e a mesma chave privada do proprietário continuam sendo usados para emitir ativações.

O controle do teste é local: SecureStore no Android/iOS e armazenamento local no navegador. Reinstalar/apagar os dados no Android ou limpar o armazenamento do navegador pode permitir novo teste; não existe controle de elegibilidade por servidor. Veja [a documentação](docs/08-teste-experimental.md).

Desde a versão 0.6, testes em andamento usam os 7 dias a partir do início já salvo. Trocar o idioma não reinicia o período. Testes já encerrados não são reabertos. Códigos de ativação e registros existentes são preservados.

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

Use o checkout da branch desta versão. Não crie worktrees para iniciar este projeto. No PowerShell, a partir da raiz do repositório:

```powershell
Set-Location Nutria
npm ci
npm start
npm run lint
npm run typecheck
npm test
$env:EXPO_OFFLINE = "1"
npx expo export --platform all
```

## Testes de interface da ativação

Use os comandos de docs/07-ativacao-email.md com uma chave pública descartável de testes e o servidor web na porta 8082. Os testes atuais são browser-activation.cjs, browser-generator.cjs e browser-flows.cjs. Os demais scripts de navegador são registros históricos da versão 0.3 e não incluem a nova etapa de ativação.

## Android

```sh
npx eas-cli@latest build --platform android --profile preview
```

Perfil preview produz APK autônomo para celulares ARM de 32 e 64 bits. O projeto EAS e a chave gerenciada são preservados para atualizar a instalação anterior. versionCode=7. Arquiteturas x86 de emuladores não são alvos deste APK. O perfil production produz AAB para loja.

## Limites desta entrega

Não há IA, scanner de código de barras, login, sincronização, Health Connect/HealthKit, assinaturas ou notificações. Dados permanecem no aparelho, sem criptografia própria nem backup automático. Não houve testes físicos em Android ou iPhone. Não publicar como produto de saúde final sem revisão de privacidade, dados nutricionais e testes em dispositivos.

Veja docs/03-capturas-e-reformulacao.md para rastreabilidade entre referência e implementação.

A integração dos PDFs está documentada em docs/05-receitas-pdfs.md. O build Android 0.3 usava versionCode 3; a versão 0.7 usa 7 e preserva a mesma chave gerenciada.
