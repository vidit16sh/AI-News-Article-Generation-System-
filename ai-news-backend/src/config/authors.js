// src/config/authors.js
export const EDITORIAL_TEAM = [
  {
    id: "mohit-kumar",
    name: "Mohit Kumar",
    role: "Founder & Editor-in-Chief",
    slug: "mohit-kumar",
    personaKey: "THE_MACRO",
    expertise: ["Crypto Regulation", "Market Structure", "Macro-Finance Law"],
    focus: ["Crypto Regulation", "Market Structure", "Bitcoin", "SEC", "Law", "Macro"],
    bio: "Mohit Kumar is the founder of CoinMarketBuzz with over a decade of experience in traditional finance and digital assets. He specializes in analyzing the intersection of global regulatory frameworks and the M2 money supply.",
    imageUrl: "/authors/mohit.jpeg",
    linkedin: "https://www.linkedin.com/in/mohit-kumar-3b497758/",
  },
  {
    id: "neelima-kumar",
    name: "Neelima Kumar",
    role: "Senior Quantitative Analyst",
    slug: "neelima-kumar",
    personaKey: "THE_ANALYST",
    expertise: ["Algorithmic Trading", "On-Chain Forensics", "Liquidity Flows"],
    focus: ["DeFi", "Technical Analysis", "Altcoins", "On-Chain Data", "Market Trends"],
    bio: "Neelima is a Senior Quantitative Analyst at CoinMarketBuzz. She focuses on translating complex on-chain data into actionable market intelligence, specializing in Ethereum L2 scaling and whale wallet forensics.",
    imageUrl: "/authors/neelima.jpeg",
    linkedin: "https://www.linkedin.com/in/neelima-kumar-335127383/", 
  },
  {
    id: "oladapo-olagoke",
    name: "Oladapo Timothy Olagoke",
    role: "Web3 Strategist & Blockchain Executive",
    slug: "oladapo-timothy-olagoke",
    personaKey: "THE_BUILDER",
    expertise: ["Web3 Infrastructure", "DAOs", "Crypto Journalism"],
    focus: ["DAOs", "Web3 Infrastructure", "Governance", "Adoption", "Technology"],
    bio: "Oladapo is a seasoned blockchain executive and the CEO of RevoNetwork. With over 7 years of experience as a crypto journalist for outlets like BTC Republic, he bridges the gap between complex blockchain infrastructure and mass-market utility.",
    imageUrl: "/authors/oladapo.jpeg",
    linkedin: "https://ng.linkedin.com/in/oladapo-timothy-olagoke", 
  },
  {
    id: "editorial-desk",
    name: "CoinMarketBuzz Desk",
    role: "Automated Data Insights",
    slug: "editorial-desk",
    personaKey: "THE_INSIDER", 
    expertise: ["Crypto Regulation", "Market Structure", "Macro-Finance Law"],
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