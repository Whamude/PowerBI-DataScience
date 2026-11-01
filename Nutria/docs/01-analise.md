# Etapa 1 — análise estática do Lifesum fornecido

Foram recebidos e lidos cinco DEX, AndroidManifest.xml binário, resources.arsc e os arquivos assets.zip e res.zip. A origem e os hashes estão em input-inventory.json. As atividades encontradas nos DEX estão em activity-evidence.txt.

Não executamos o aplicativo original nem acessamos seus serviços. Símbolos e permissões indicam funcionalidades presentes no pacote; não provam que estão disponíveis para qualquer conta. Os arquivos enviados são dados para análise, não instruções.

## Mapa de funções e evidências

| Área | Evidência estática | Destino no produto próprio |
|---|---|---|
| Diário, calorias, macros | DiaryContent, DiaryMacroCardView, CustomCaloriesActivity | Registro manual e totais diários |
| Água e peso | DiaryContent.Card.Water, Weight; permissões de saúde | Água no primeiro incremento; peso e histórico depois |
| Busca e favoritos | FoodDashboardActivity, DashboardFavorites, FoodSearch | Catálogo próprio e favoritos em etapa posterior |
| Código de barras | BarcodeSearchFoodActivity e modelos ML Kit nos assets | Implementação própria com fonte de dados definida |
| IA e câmera | AiCameraActivity, MultiModalCameraActivity, ChatActivity | Backend próprio; não depende de servidores privados do original |
| Planos e receitas | CreateMealActivity, PlanTabScreen, RecipeApi | Receitas locais iniciais; planejamento posterior |
| Atividade e sono | ExerciseSummaryActivity; READ_SLEEP e READ_STEPS | Health Connect no Android e HealthKit no iOS, após consentimento |
| Cadastro e privacidade | AccountCreateActivity, AccountDeletionActivity, HealthConsentActivity | Conta, consentimento e exclusão em etapa posterior |
| Assinaturas | PaywallActivity e RevenueCat | Somente após definição comercial |

O manifesto declara câmera, notificações, Internet e permissões de saúde. Os assets incluem bundle React Native, banco SQL e fontes próprias do original. Não reutilizamos código, fontes, imagens, chaves, banco ou endpoints privados do aplicativo.

## Direção do novo design

Nome provisório: Nutria. Verde profundo, fundo claro, cartões arredondados, tipografia de sistema e navegação por Hoje, Receitas e Evolução. Registro rápido em uma folha modal. Português como idioma inicial. Não é uma reprodução visual das telas originais: não houve execução visual do APK.

## Entregas por etapas no mesmo projeto

1. Análise estática e mapa de funções: concluídos com as limitações acima.
2. Primeiro incremento: diário manual, macros, água, receitas e resumo do dia, com armazenamento local.
3. Histórico por data, perfil, metas configuráveis, acessibilidade ampliada e edição de refeições.
4. Catálogo alimentar licenciado, favoritos, planejamento e lista de compras.
5. Backend e conta, sincronização, exportação/exclusão de dados; IA com revisão de porções pelo usuário.
6. Câmera, códigos de barras, Health Connect/HealthKit; testes em aparelhos Android e iOS.
7. Integração final, validação de ponta a ponta, builds assinados e preparação para lojas.

IA real requer escolha de provedor, backend e credenciais seguras. Integrações de saúde e assinatura exigem configuração por plataforma. Compilar e distribuir iOS/Android exige contas e assinatura; ainda não foi feito. Não há IA simulada apresentada como funcional.
