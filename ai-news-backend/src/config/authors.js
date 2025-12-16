export const EDITORIAL_TEAM = [
  {
    id: "author_tech_01",
    name: "Elena Rostova",
    role: "Senior Tech Analyst",
    personaKey: "THE_FUTURIST",
    slug: "elena-rostova",
    focus: ["technology", "nft", "metaverse", "development"],
    bio: "Elena covers protocol upgrades and Web3 infrastructure."
  },
  {
    id: "author_markets_01",
    name: "Marcus Thorne",
    role: "Lead Market Strategist",
    personaKey: "THE_ANALYST",
    slug: "marcus-thorne",
    focus: ["bitcoin", "ethereum", "price", "markets", "trading"],
    bio: "Marcus specializes in on-chain metrics and technical analysis."
  },
  {
    id: "author_reg_01",
    name: "Sarah Jenkins",
    role: "Policy Correspondent",
    personaKey: "THE_INSIDER",
    slug: "sarah-jenkins",
    focus: ["sec", "regulation", "law", "scam", "hack"],
    bio: "Sarah investigates crypto regulation and security breaches."
  }
];

export const getAuthorForCategory = (title, tags = []) => {
  const text = (title + " " + tags.join(" ")).toLowerCase();
  
  if (text.includes("price") || text.includes("chart") || text.includes("bull")) {
    return EDITORIAL_TEAM[1]; // Marcus (Markets)
  }
  if (text.includes("sec") || text.includes("law") || text.includes("hack")) {
    return EDITORIAL_TEAM[2]; // Sarah (Policy)
  }
  return EDITORIAL_TEAM[0]; // Elena (Tech/Default)
};