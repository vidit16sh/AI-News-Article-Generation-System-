// src/app/editorial-policy/page.js
import Link from "next/link";

export const metadata = {
  title: "Editorial Policy | VrajNews",
  description:
    "How VrajNews produces AI-assisted coverage with human editorial oversight, transparency, sourcing, and correction standards.",
};

export default function EditorialPolicyPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs font-medium text-slate-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-slate-800 transition-colors">
              Home
            </Link>
          </li>
          <li>/</li>
          <li className="text-slate-700" aria-current="page">
            Editorial Policy
          </li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Editorial Policy
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          VrajNews publishes timely crypto and technology coverage using{" "}
          <strong>AI-assisted data analysis with human oversight</strong>. This page
          explains how our content is created, reviewed, and corrected.
        </p>
      </header>

      <main className="prose prose-slate max-w-none">
        <h2>How our content is produced</h2>
        <ul>
          <li>
            We monitor public sources (press releases, reputable publishers, and public market data)
            using automated systems to identify noteworthy stories.
          </li>
          <li>
            AI tools may assist with summarization, topic classification, headline suggestions,
            and extracting key facts (“By the Numbers”).
          </li>
          <li>
            A human editor reviews articles before publication to confirm clarity, formatting,
            and to reduce obvious errors or hallucinations.
          </li>
        </ul>

        <h2>Human oversight and accountability</h2>
        <p>
          Every published article is attributed to an author profile. Author pages include
          a bio and a list of recent work to support transparency and accountability.
        </p>

        <h2>Sourcing, attribution, and links</h2>
        <ul>
          <li>We aim to cite or link to original sources when available.</li>
          <li>We avoid copying paywalled or proprietary text.</li>
          <li>We clearly distinguish reporting from opinion when applicable.</li>
        </ul>

        <h2>Corrections policy</h2>
        <p>
          If a factual error is identified, we correct it as quickly as possible. Material
          changes may be reflected within the article content or metadata. If you believe an
          article contains an error, contact us and include the article link and the correction request.
        </p>

        <h2>Financial and investment disclaimer</h2>
        <p>
          Content on VrajNews is for informational purposes only and does not constitute financial,
          legal, or investment advice. Cryptocurrency markets are volatile. Always do your own research
          and consult professionals where appropriate.
        </p>

        <h2>AI transparency</h2>
        <p>
          We are transparent about our use of AI. Articles may be AI-assisted, but publication includes
          human editorial review. Our goal is to provide fast, readable coverage while maintaining clear
          sourcing and responsible presentation.
        </p>
      </main>
    </div>
  );
}
