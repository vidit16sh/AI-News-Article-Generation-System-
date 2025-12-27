// src/app/terms/page.js
import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions | CoinMarketBuzz",
  description: "Terms and conditions for using CoinMarketBuzz.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-12 sm:px-6 lg:px-8">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-xs font-medium text-slate-500"
      >
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="transition-colors hover:text-slate-800">
              Home
            </Link>
          </li>
          <li>/</li>
          <li className="text-slate-700" aria-current="page">
            Terms &amp; Conditions
          </li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Terms &amp; Conditions
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Last Updated: <span className="italic">[Insert Date]</span>
        </p>

        <p className="mt-5 max-w-[85ch] text-sm leading-relaxed text-slate-600">
          Welcome to CoinMarketBuzz.com (“CoinMarketBuzz”, “we”, “our”, or “us”).
          By accessing or using this website, you agree to comply with and be
          bound by the following Terms and Conditions.
        </p>

        <p className="mt-3 max-w-[85ch] text-sm leading-relaxed text-slate-600">
          If you do not agree with these terms, please discontinue use of the
          website.
        </p>
      </header>

      <main className="prose prose-slate max-w-none text-slate-700">
        <h2>1. Use of Website</h2>
        <p>
          CoinMarketBuzz.com provides news, information, and educational content
          related to cryptocurrency, blockchain, finance, technology, and
          business.
        </p>
        <ul>
          <li>Content is for informational purposes only</li>
          <li>We do not provide financial, investment, legal, or tax advice</li>
          <li>
            Users are responsible for how they interpret or act on the
            information
          </li>
        </ul>

        <h2>2. Intellectual Property Rights</h2>
        <p>
          All content published on CoinMarketBuzz.com, including articles, text,
          graphics, logos, and design, is the intellectual property of
          CoinMarketBuzz unless otherwise stated.
        </p>
        <p>
          Unauthorized reproduction, copying, or redistribution without written
          permission is strictly prohibited.
        </p>

        <h2>3. User Conduct</h2>
        <p>Users agree not to:</p>
        <ul>
          <li>Use the website for unlawful purposes</li>
          <li>Submit false, misleading, or harmful information</li>
          <li>Attempt to hack, disrupt, or compromise site security</li>
          <li>Scrape or automate content without permission</li>
        </ul>
        <p>
          We reserve the right to restrict access to users who violate these
          terms.
        </p>

        <h2>4. Third-Party Links</h2>
        <p>
          Our website may contain links to third-party websites for reference or
          advertising purposes.
        </p>
        <p>
          CoinMarketBuzz does not control or endorse third-party content and is
          not responsible for external websites’ practices or policies.
        </p>

        <h2>5. Sponsored Content &amp; Press Releases</h2>
        <p>
          CoinMarketBuzz may publish sponsored articles, press releases, or
          promotional content.
        </p>
        <ul>
          <li>Sponsored content is clearly labeled</li>
          <li>Editorial independence is maintained</li>
          <li>Advertisers do not influence news coverage</li>
        </ul>

        <h2>6. Disclaimer of Warranties</h2>
        <p>
          All content is provided “as is” and “as available.” We make no
          guarantees regarding accuracy, completeness, or reliability of
          information.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          CoinMarketBuzz shall not be liable for any direct, indirect,
          incidental, or consequential damages arising from the use of this
          website.
        </p>

        <h2>8. Modifications</h2>
        <p>
          We reserve the right to update these Terms &amp; Conditions at any
          time. Continued use of the website constitutes acceptance of changes.
        </p>

        <h2>9. Governing Law</h2>
        <p>
          These terms are governed by and construed in accordance with the laws
          of India.
        </p>

        <h2>10. Contact</h2>
        <p className="not-prose mt-2">
          📧{" "}
          <a
            href="mailto:Contact@CoinmarketBuzz.com"
            className="font-medium text-blue-600 hover:underline"
          >
            Contact@CoinmarketBuzz.com
          </a>
        </p>
      </main>
    </div>
  );
}
