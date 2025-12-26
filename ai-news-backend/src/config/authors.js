// src/config/authors.js
export const EDITORIAL_TEAM = [
  {
    id: "mohit-kumar",
    name: "Mohit Kumar",
    role: "Founder & Editor-in-Chief",
    slug: "mohit-kumar",
    personaKey: "THE_MACRO",
    focus: ["Crypto Regulation", "Market Structure", "Bitcoin", "SEC", "Law", "Macro"],
    bio: "Mohit Kumar is the founder of CoinMarketBuzz, covering macro-financial trends and regulatory frameworks. He specializes in the intersection of Law and the digital asset economy.",
    imageUrl: "/authors/mohit.jpeg",
    linkedin: "https://www.linkedin.com/in/mohit-kumar-3b497758/",
  },
  {
    id: "neelima-kumar",
    name: "Neelima Kumar",
    role: "Senior Quantitative Analyst",
    slug: "neelima-kumar",
    personaKey: "THE_ANALYST",
    focus: ["DeFi", "Technical Analysis", "Altcoins", "On-Chain Data", "Market Trends"],
    bio: "Neelima is a Senior Quantitative Analyst specializing in algorithmic trading and on-chain liquidity analysis. She tracks institutional capital flows to identify market cycles.",
    imageUrl: "/authors/neelima.jpeg",
    linkedin: "https://www.linkedin.com/in/neelima-kumar-335127383/",
  },
  {
    id: "oladapo-olagoke",
    name: "Oladapo Timothy Olagoke",
    role: "Web3 Strategist & Blockchain Executive",
    slug: "oladapo-timothy-olagoke",
    personaKey: "THE_BUILDER",
    focus: ["DAOs", "Web3 Infrastructure", "Governance", "Adoption", "Technology"],
    bio: "Oladapo is a blockchain executive and CEO of RevoNetwork. He covers decentralized governance (DAOs), blockchain utility, and global Web3 mass adoption strategy.",
    imageUrl: "/authors/oladapo.jpeg",
    linkedin: "https://ng.linkedin.com/in/oladapo-timothy-olagoke",
  },
  {
    id: "editorial-desk",
    name: "CoinMarketBuzz Desk",
    role: "Automated Data Insights",
    slug: "editorial-desk",
    personaKey: "THE_INSIDER",
    focus: ["Breaking News", "Price Alerts"],
    bio: "The CoinMarketBuzz Desk tracks real-time market data, exchange listings, and on-chain alerts.",
    imageUrl: "/brand/logocircle.png",
    linkedin: null,
  },
];

export const getAuthorForCategory = (title, tags = []) => {
  const text = (title + " " + tags.join(" ")).toLowerCase();

  // 1. MOHIT: Law, Regulation, Bitcoin, and Global Macro
  if (
    text.includes("sec") || text.includes("regulation") || text.includes("law") || 
    text.includes("etf") || text.includes("bitcoin") || text.includes("btc") ||
    text.includes("fed") || text.includes("government") || text.includes("policy") ||
    text.includes("gensler") || text.includes("inflation") || text.includes("trump")
  ) {
    return EDITORIAL_TEAM[0];
  }

  // 2. OLADAPO: Web3, Infrastructure, Business, and Adoption
  if (
    text.includes("dao") || text.includes("governance") || text.includes("partnership") || 
    text.includes("infrastructure") || text.includes("web3") || text.includes("layer") ||
    text.includes("adoption") || text.includes("executive") || text.includes("startup") ||
    text.includes("funding") || text.includes("enterprise") || text.includes("tech")
  ) {
    return EDITORIAL_TEAM[2];
  }

  // 3. NEELIMA: Technicals, On-Chain, Altcoins, and General Analysis
  if (
    text.includes("analysis") || text.includes("prediction") || text.includes("forecast") || 
    text.includes("technical") || text.includes("chart") || text.includes("altcoin") ||
    text.includes("eth") || text.includes("ethereum") || text.includes("defi") ||
    text.includes("on-chain") || text.includes("whale") || text.includes("volume")
  ) {
    return EDITORIAL_TEAM[1];
  }

  // 4. DESK: Only very specific "Automated Alert" style keywords
  if (
    text.includes("breaking") || text.includes("alert") || text.includes("now") || 
    text.includes("listing") || text.includes("delisting") || text.includes("suspended")
  ) {
    return EDITORIAL_TEAM[3];
  }

  // 5. THE "HUMAN" FALLBACK (Rotation)
  // Instead of defaulting to the Desk, we rotate between our 3 human experts
  // so general news still gets high E-E-A-T scores.
  const hour = new Date().getHours();
  const humanIndex = hour % 3; // Rotates 0, 1, 2 every hour
  return EDITORIAL_TEAM[humanIndex];
};