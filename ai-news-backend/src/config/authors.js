export const EDITORIAL_TEAM = [
  {
    id: "mohit-kumar",
    name: "Mohit Kumar",
    role: "Founder & Editor-in-Chief", 
    slug: "mohit-kumar",
    personaKey: "THE_MACRO",
    linkedin: "https://www.linkedin.com/in/mohit-kumar-3b497758/",
    focus: ["Crypto Regulation", "Market Structure", "Bitcoin", "SEC", "Law"],
    bio: "Mohit is the founder of CoinMarketBuzz, covering macro-financial trends and regulatory frameworks in the digital asset space. He bridges the gap between traditional finance and the crypto economy.",
    imageUrl: "/authors/mohit.jpg" 
  },
  {
    id: "neelima-kumar",
    name: "Neelima Kumar",
    role: "Senior Quantitative Analyst", 
    personaKey: "THE_ANALYST",
    slug: "neelima-kumar", // 👈 MUST match DB
    linkedin: "https://www.linkedin.com/in/neelima-kumar-335127383/",
    focus: ["DeFi", "Ethereum", "Altcoins", "Price Analysis", "On-Chain Data"],
    bio: "Neelima is a Senior Quantitative Analyst at Stockpil, specializing in algorithmic trading strategies and on-chain liquidity analysis. She tracks institutional capital flows to identify emerging trends.",
    imageUrl: "/authors/neelima.jpg"
  },
  {
    id: "editorial-desk",
    name: "CoinMarketBuzz Desk",
    role: "Automated Data Insights",
    slug: "editorial-desk",
    personaKey: "THE_INSIDER",// 👈 MUST match DB
    focus: ["Breaking News", "Price Alerts", "Global Markets"],
    bio: "Real-time market updates powered by the CoinMarketBuzz algorithmic data engine, monitoring 24/7 global trading activity.",
    imageUrl: "/logo.png"
  }
];

export const getAuthorForCategory = (title, tags = []) => {
  const text = (title + " " + tags.join(" ")).toLowerCase();
  
  // 1. Neelima (Markets / Price / Tech)
  if (
    text.includes("price") || 
    text.includes("analysis") || 
    text.includes("chart") || 
    text.includes("defi") ||
    text.includes("ethereum") ||
    text.includes("altcoin")
  ) {
    return EDITORIAL_TEAM[1]; 
  }

  // 2. Mohit (Regulation / Macro / Founder stuff)
  if (
    text.includes("sec") || 
    text.includes("law") || 
    text.includes("regulation") || 
    text.includes("policy") || 
    text.includes("court") ||
    text.includes("banned") ||
    text.includes("trump") ||
    text.includes("gensler")
  ) {
    return EDITORIAL_TEAM[0]; 
  }

  // 3. Default to Desk for generic breaking news
  return EDITORIAL_TEAM[2]; 
};