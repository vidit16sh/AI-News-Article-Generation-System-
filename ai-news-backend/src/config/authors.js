export const EDITORIAL_TEAM = [
  {
    id: "mohit-kumar",
    name: "Mohit Kumar",
    role: "Founder & Editor-in-Chief",
    slug: "mohit-kumar",
    personaKey: "THE_MACRO",
    focus: ["Crypto Regulation", "Market Structure", "Bitcoin", "SEC", "Law"],
    bio: "Mohit is the founder of CoinMarketBuzz, covering macro-financial trends and regulatory frameworks in the digital asset space. He bridges the gap between traditional finance and the crypto economy.",
    imageUrl: "/authors/mohit.jpeg",
    linkedin: "https://www.linkedin.com/in/mohit-kumar-3b497758/",
  },
  {
    id: "neelima-kumar",
    name: "Neelima Kumar",
    role: "Senior Quantitative Analyst",
    slug: "neelima-kumar",
    personaKey: "THE_ANALYST",
    focus: [
      "DeFi",
      "Technical Analysis",
      "Altcoins",
      "On-Chain Data",
      "Algorithmic Trading",
    ],
    bio: "Neelima is a Senior Quantitative Analyst, specializing in algorithmic trading strategies and on-chain liquidity analysis. She tracks institutional capital flows to identify emerging trends.",
    imageUrl: "/authors/neelima.jpeg",
    linkedin: "https://www.linkedin.com/in/neelima-kumar-335127383/",
  },
  {
    id: "oladapo-olagoke",
    name: "Oladapo Timothy Olagoke",
    role: "Web3 Strategist & Blockchain Executive",
    slug: "oladapo-timothy-olagoke",
    personaKey: "THE_BUILDER",
    focus: [
      "DAOs",
      "Web3 Infrastructure",
      "Crypto Governance",
      "Business Strategy",
      "Adoption",
    ],
    bio: "Oladapo is a blockchain executive and CEO of RevoNetwork with a focus on organizational decision-making in Web3. He covers the intersection of decentralized governance (DAOs), blockchain utility, and mass adoption strategy.",
    imageUrl: "/authors/oladapo.jpeg",
    linkedin: "https://ng.linkedin.com/in/oladapo-timothy-olagoke",
  },
  {
    id: "editorial-desk",
    name: "CoinMarketBuzz Desk",
    role: "Automated Data Insights",
    slug: "editorial-desk",
    personaKey: "THE_INSIDER",
    focus: ["Breaking News", "Price Alerts", "Global Markets"],
    bio: "The CoinMarketBuzz Desk tracks real-time market data, regulatory filings, and on-chain alerts. Our automated insights ensure you get the facts as they happen.",
    // ✅ FIX: match your actual logo path (same as Header/Footer)
    imageUrl: "/brand/logocircle.png",
    linkedin: null,
  },
];

export const getAuthorForCategory = (title, tags = []) => {
  const text = (title + " " + tags.join(" ")).toLowerCase();

  // 1) ROUTING FOR HUMANS (High E-E-A-T)

  // Mohit: Law & Macro
  if (
    text.includes("sec") ||
    text.includes("regulation") ||
    text.includes("lawsuit") ||
    text.includes("policy") ||
    text.includes("etf") ||
    text.includes("inflation") ||
    text.includes("fed") ||
    text.includes("gensler")
  ) {
    return EDITORIAL_TEAM[0];
  }

  // Oladapo: Business & Governance
  if (
    text.includes("dao") ||
    text.includes("governance") ||
    text.includes("partnership") ||
    text.includes("ceo") ||
    text.includes("startup") ||
    text.includes("funding") ||
    text.includes("infrastructure") ||
    text.includes("layer 1") ||
    text.includes("layer 2") ||
    text.includes("layer1") ||
    text.includes("layer2")
  ) {
    return EDITORIAL_TEAM[2];
  }

  // Neelima: Technical Analysis (only when it's explicitly analysis + market context)
  if (
    (text.includes("analysis") ||
      text.includes("prediction") ||
      text.includes("forecast") ||
      text.includes("technical") ||
      text.includes("chart") ||
      text.includes("rsi")) &&
    (text.includes("price") || text.includes("crypto") || text.includes("market"))
  ) {
    return EDITORIAL_TEAM[1];
  }

  // 2) ROUTING FOR DESK (High velocity / low E-E-A-T)

  // Desk: simple price/breaking/alert updates (without the "analysis" signals above)
  if (
    text.includes("price") ||
    text.includes("surge") ||
    text.includes("drop") ||
    text.includes("alert") ||
    text.includes("now") ||
    text.includes("breaking")
  ) {
    return EDITORIAL_TEAM[3];
  }

  // 3) Fallback to Desk
  return EDITORIAL_TEAM[3];
};
