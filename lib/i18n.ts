export type Locale = "pt" | "en";

export const translations = {
  pt: {
    nav: {
      calculator: "Calculadora",
      login: "Login com Discord",
      loginShort: "Entrar",
      dashboard: "Dashboard",
      newOffer: "Nova oferta",
      logout: "Sair",
      admin: "Admin",
      adminItems: "Preços dos itens",
      disputes: "Disputas",
      rep: "REP",
      back: "Voltar",
      viewOffer: "Ver proposta",
      theme: "Tema",
      light: "Claro",
      dark: "Escuro",
      language: "Idioma",
    },
    home: {
      title: "GPO Trader",
      subtitle: "Mercado Seguro Grand Piece Online",
      description: "Web of Trust para trocas justas em GPO. Reputação real, sem golpes.",
      cta: "Ver mercado",
      statsTrades: "Trocas",
      statsVolume: "Volume",
      statsUsers: "Usuários",
    },
    market: {
      title: "Mercado",
      loadMore: "Carregar mais ofertas",
      noListings: "Nenhuma oferta no momento.",
      selling: "Vendendo",
      buying: "Comprando",
      itemsInPackage: "itens no pacote",
      item: "item",
      clickDetails: "Clique para ver detalhes",
      backToMarket: "Voltar ao mercado",
    },
    create: {
      title: "Nova oferta",
      description: "Escolha o tipo de oferta e os itens. Máximo 10 itens por oferta; quantidade de 1 a 30 por item.",
      activeListings: "Ofertas ativas",
      typeLabel: "Tipo de oferta",
      have: "Eu tenho (Vender)",
      want: "Eu quero (Comprar)",
      selectItems: "Selecione os itens",
      selected: "Selecionados",
      maxPerItem: "quantidade máx. 30 por item",
      addItem: "Adicionar item",
      publish: "Publicar oferta",
      publishing: "Publicando…",
      backToMarket: "Voltar para o mercado",
    },
    calculator: {
      title: "Calculadora de trade",
      description: "Adicione os itens que você dá e os que você recebe. A calculadora usa o valor em Legendary Chests para dizer se a troca é boa ou ruim.",
      youGive: "O que você dá",
      youReceive: "O que você recebe",
      swap: "troca",
      addItem: "Adicionar item",
      total: "Total",
      goodTrade: "Boa troca",
      goodTradeDesc: "Você recebe cerca de {percent}% a mais em valor.",
      badTrade: "Troca ruim",
      badTradeDesc: "Você está dando cerca de {percent}% a mais em valor.",
      fairTrade: "Troca equilibrada",
      fairTradeDesc: "Os valores estão próximos.",
      difference: "Diferença",
      addItemsHint: "Adicione itens em cada lado para calcular se a troca é boa ou ruim.",
    },
    listingDetail: {
      itemsTitle: "Itens da oferta",
      reputation: "Reputação",
      neverSharePasswords: "Nunca passe senhas. Negocie apenas itens dentro do jogo.",
      deleteOffer: "Excluir oferta",
      acceptTrade: "Aceitar troca",
      noItems: "Nenhum item nesta oferta.",
      discontinued: "Descontinuado",
    },
    footer: {
      disclaimer: "GPO Trader não é afiliado, endossado ou de qualquer forma ligado à Roblox Corporation ou ao jogo Grand Piece Online. Todas as marcas são de seus respectivos donos.",
      terms: "Termos de uso",
    },
    common: {
      save: "Salvar",
      cancel: "Cancelar",
      close: "Fechar",
      loading: "A carregar…",
      error: "Erro",
    },
  },
  en: {
    nav: {
      calculator: "Calculator",
      login: "Login with Discord",
      loginShort: "Log in",
      dashboard: "Dashboard",
      newOffer: "New offer",
      logout: "Log out",
      admin: "Admin",
      adminItems: "Item prices",
      disputes: "Disputes",
      rep: "REP",
      back: "Back",
      viewOffer: "View offer",
      theme: "Theme",
      light: "Light",
      dark: "Dark",
      language: "Language",
    },
    home: {
      title: "GPO Trader",
      subtitle: "Secure Grand Piece Online Market",
      description: "Web of Trust for fair trades in GPO. Real reputation, no scams.",
      cta: "View market",
      statsTrades: "Trades",
      statsVolume: "Volume",
      statsUsers: "Users",
    },
    market: {
      title: "Market",
      loadMore: "Load more offers",
      noListings: "No offers at the moment.",
      selling: "Selling",
      buying: "Buying",
      itemsInPackage: "items in package",
      item: "item",
      clickDetails: "Click for details",
      backToMarket: "Back to market",
    },
    create: {
      title: "New offer",
      description: "Choose offer type and items. Max 10 items per offer; quantity 1–30 per item.",
      activeListings: "Active offers",
      typeLabel: "Offer type",
      have: "I have (Sell)",
      want: "I want (Buy)",
      selectItems: "Select items",
      selected: "Selected",
      maxPerItem: "max 30 per item",
      addItem: "Add item",
      publish: "Publish offer",
      publishing: "Publishing…",
      backToMarket: "Back to market",
    },
    calculator: {
      title: "Trade calculator",
      description: "Add the items you give and the items you receive. The calculator uses Legendary Chest value to tell if the trade is good or bad.",
      youGive: "What you give",
      youReceive: "What you receive",
      swap: "swap",
      addItem: "Add item",
      total: "Total",
      goodTrade: "Good trade",
      goodTradeDesc: "You receive about {percent}% more in value.",
      badTrade: "Bad trade",
      badTradeDesc: "You are giving about {percent}% more in value.",
      fairTrade: "Fair trade",
      fairTradeDesc: "Values are close.",
      difference: "Difference",
      addItemsHint: "Add items on each side to calculate if the trade is good or bad.",
    },
    listingDetail: {
      itemsTitle: "Offer items",
      reputation: "Reputation",
      neverSharePasswords: "Never share passwords. Only negotiate in-game items.",
      deleteOffer: "Delete offer",
      acceptTrade: "Accept trade",
      noItems: "No items in this offer.",
      discontinued: "Discontinued",
    },
    footer: {
      disclaimer: "GPO Trader is not affiliated with, endorsed by, or connected to Roblox Corporation or Grand Piece Online. All trademarks belong to their respective owners.",
      terms: "Terms of use",
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      close: "Close",
      loading: "Loading…",
      error: "Error",
    },
  },
} as const;

export type TranslationKey = keyof typeof translations.pt;

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const value = getNested(translations[locale] as Record<string, unknown>, key);
  if (value == null) return getNested(translations.pt as Record<string, unknown>, key) ?? key;
  if (!params) return value;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    value
  );
}
