// src/app/editorial-policy/page.js
import Link from "next/link";

export const metadata = {
  title: "Editorial Policy - CoinMarketBuzz",
  description:
    "Learn how CoinMarketBuzz creates, reviews, and publishes content with editorial independence, transparency, and ethical standards.",
};

export default function EditorialPolicyPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-xs font-medium text-slate-500"
      >
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

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Editorial Policy
        </h1>
        <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-slate-600">
          CoinMarketBuzz is an independent digital news platform committed to
          accuracy, transparency, and responsible journalism. This page outlines
          how our editorial content is created, reviewed, and maintained.
        </p>
      </header>

      {/* Content */}
      <main className="prose prose-slate max-w-none">
        <h2>Editorial Independence</h2>
        <p>
          CoinMarketBuzz operates with full editorial independence. Our editorial
          decisions are made without influence from advertisers, sponsors, or
          commercial partners.
        </p>
        <p>
          Sponsored partnerships do not affect our news coverage. Any sponsored
          or promotional content is clearly disclosed to ensure transparency for
          our readers.
        </p>

        <h2>Content Standards</h2>
        <p>
          We publish content related to cryptocurrency, blockchain, finance,
          technology, business, and regulatory developments. All editorial
          content follows these principles:
        </p>
        <ul>
          <li>Fact-based and verifiable reporting</li>
          <li>Neutral, professional, and balanced tone</li>
          <li>Clear attribution of sources where applicable</li>
          <li>Clear distinction between editorial and sponsored material</li>
        </ul>

        <h2>Accuracy &amp; Corrections</h2>
        <p>
          Accuracy is a core priority at CoinMarketBuzz. We make reasonable
          efforts to verify information before publication.
        </p>
        <p>
          If an error is identified after publication, we take corrective action
          as quickly as possible. Corrections or updates are reflected directly
          within the article to maintain transparency.
        </p>

        <h2>Sponsored &amp; Promotional Content</h2>
        <p>
          Some content on CoinMarketBuzz may be sponsored or provided as press
          releases. Such content:
        </p>
        <ul>
          <li>Is clearly labeled as “Sponsored” or “Press Release”</li>
          <li>Does not mislead readers</li>
          <li>Complies with advertising and disclosure guidelines</li>
        </ul>

        <h2>Plagiarism Policy</h2>
        <p>
          CoinMarketBuzz maintains zero tolerance for plagiarism. All published
          content must be original or properly attributed to its source.
        </p>

        <h2>Ethical Standards</h2>
        <p>
          We are committed to ethical journalism. We do not publish content that
          includes:
        </p>
        <ul>
          <li>Hate speech or discriminatory language</li>
          <li>Misleading or deceptive financial claims</li>
          <li>Illegal, harmful, or unethical material</li>
        </ul>

        <h2>Contact for Editorial Concerns</h2>
        <p>
          If you have concerns regarding editorial accuracy, ethics, or
          transparency, you may contact us at:
        </p>

        <p className="not-prose mt-2">
          <a
            href="mailto:Contact@CoinmarketBuzz.com"
            className="font-medium text-blue-600 hover:underline"
          >
            contact@CoinmarketBuzz.com
          </a>
        </p>
      </main>
    </div>
  );
}
