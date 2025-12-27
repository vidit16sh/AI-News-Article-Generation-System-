// src/app/privacy/page.js
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | CoinMarketBuzz",
  description:
    "Privacy Policy for CoinMarketBuzz outlining how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
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
            Privacy Policy
          </li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last Updated: <span className="italic">[Insert Date]</span>
        </p>

        <p className="mt-5 max-w-[80ch] text-sm leading-relaxed text-slate-600">
          CoinMarketBuzz.com (“CoinMarketBuzz”, “we”, “our”, or “us”) is an
          independent digital news media platform registered in India, covering
          cryptocurrency, blockchain, finance, technology, and business news.
        </p>
        <p className="mt-3 max-w-[80ch] text-sm leading-relaxed text-slate-600">
          We are committed to protecting user privacy and complying with
          applicable data protection laws, Google AdSense policies, and Google
          News Publisher guidelines.
        </p>
        <p className="mt-3 max-w-[80ch] text-sm leading-relaxed text-slate-600">
          By accessing or using CoinMarketBuzz.com, you agree to the practices
          described in this Privacy Policy.
        </p>
      </header>

      <main className="prose prose-slate max-w-none text-slate-700">
        <h2>1. Information We Collect</h2>

        <h3>1.1 Personal Information (Voluntarily Provided)</h3>
        <p>
          We may collect personal information when you voluntarily provide it,
          including:
        </p>
        <ul>
          <li>Name</li>
          <li>Email address</li>
          <li>Contact details</li>
        </ul>

        <p>Information may be submitted via:</p>
        <ul>
          <li>Contact forms</li>
          <li>Newsletter subscriptions</li>
          <li>Press release or sponsored content submissions</li>
          <li>Media or business inquiries</li>
        </ul>

        <p>
          We collect only the minimum data necessary to provide our services.
        </p>

        <h3>1.2 Automatically Collected Information</h3>
        <p>
          When you visit CoinMarketBuzz.com, we may automatically collect
          non-personal information such as:
        </p>
        <ul>
          <li>IP address</li>
          <li>Browser type and version</li>
          <li>Device and operating system</li>
          <li>Pages visited, time spent, and interaction data</li>
          <li>Referring website URLs</li>
        </ul>

        <p>
          This information is used strictly for analytics, performance
          optimization, security, and fraud prevention.
        </p>

        <h2>2. How We Use Your Information</h2>
        <p>We use collected information to:</p>
        <ul>
          <li>Operate and maintain the website</li>
          <li>Deliver news and informational content</li>
          <li>Respond to user inquiries and communications</li>
          <li>Send newsletters (only with user consent)</li>
          <li>Analyze traffic and user behavior</li>
          <li>Improve content quality and user experience</li>
          <li>Detect, prevent, and address technical or security issues</li>
          <li>Comply with legal and regulatory obligations</li>
        </ul>

        <p>
          <strong>We do not sell, rent, or trade personal data to third
          parties.</strong>
        </p>

        <h2>3. Cookies and Similar Technologies</h2>
        <p>
          CoinMarketBuzz.com uses cookies, web beacons, and similar technologies
          to:
        </p>
        <ul>
          <li>Analyze website traffic and usage patterns</li>
          <li>Understand user preferences</li>
          <li>Improve website performance and functionality</li>
          <li>Serve relevant advertisements</li>
        </ul>

        <p>
          Users may choose to disable cookies through their browser settings.
          Please note that disabling cookies may affect certain site
          functionalities.
        </p>

        <h2>4. Google AdSense &amp; Advertising Partners</h2>
        <p>
          CoinMarketBuzz.com uses Google AdSense and other third-party advertising
          services.
        </p>

        <h3>How Google Uses Data</h3>
        <ul>
          <li>
            Google may use cookies (including the DoubleClick cookie) to serve
            ads based on users’ visits to this and other websites.
          </li>
          <li>
            Users may opt out of personalized advertising by visiting Google Ads
            Settings.
          </li>
          <li>
            Advertising partners may collect information in accordance with
            their own privacy policies. CoinMarketBuzz does not control or access
            advertiser-collected data.
          </li>
        </ul>

        <h2>5. Third-Party Services &amp; Analytics</h2>
        <p>We may use third-party services such as:</p>
        <ul>
          <li>Google Analytics</li>
          <li>Advertising networks</li>
          <li>Content delivery networks (CDNs)</li>
          <li>Security and performance monitoring tools</li>
        </ul>

        <p>
          These services may collect anonymized usage data as governed by their
          respective privacy policies. CoinMarketBuzz is not responsible for
          third-party privacy practices.
        </p>

        <h2>6. Sponsored Content &amp; Press Releases</h2>
        <p>CoinMarketBuzz may publish:</p>
        <ul>
          <li>Sponsored articles</li>
          <li>Advertorials</li>
          <li>Press releases</li>
          <li>Affiliate or promotional content</li>
        </ul>

        <p>
          All paid or sponsored content is clearly labeled in accordance with
          Google News and journalistic transparency standards. Editorial integrity
          is maintained at all times.
        </p>

        <h2>7. Data Security</h2>
        <p>
          We take reasonable administrative, technical, and organizational
          measures to safeguard user data, including:
        </p>
        <ul>
          <li>Secure hosting infrastructure</li>
          <li>Restricted access controls</li>
          <li>Malware and threat protection</li>
        </ul>

        <p>
          However, no method of online transmission or storage is completely
          secure, and absolute security cannot be guaranteed.
        </p>

        <h2>8. Data Retention</h2>
        <p>
          Personal information is retained only for as long as necessary to:
        </p>
        <ul>
          <li>Fulfill the purposes outlined in this policy</li>
          <li>Meet legal, regulatory, or contractual obligations</li>
        </ul>

        <p>
          Data no longer required is securely deleted or anonymized.
        </p>

        <h2>9. User Rights &amp; Choices</h2>
        <p>
          Depending on applicable laws, users may have the right to:
        </p>
        <ul>
          <li>Access their personal information</li>
          <li>Request corrections or deletion</li>
          <li>Withdraw consent for communications</li>
          <li>Object to certain data processing</li>
        </ul>

        <p>
          Requests can be made by contacting us at{" "}
          <a href="mailto:Contact@CoinmarketBuzz.com">
            Contact@CoinmarketBuzz.com
          </a>
          .
        </p>

        <h2>10. Children’s Information</h2>
        <p>
          CoinMarketBuzz.com does not knowingly collect personal information from
          children under the age of 13. If such information is identified, it
          will be promptly removed.
        </p>

        <h2>11. Legal Compliance (India &amp; Global Standards)</h2>
        <p>This Privacy Policy complies with:</p>
        <ul>
          <li>Information Technology Act, 2000 (India)</li>
          <li>IT Rules, 2011 (Reasonable Security Practices)</li>
        </ul>

        <p>
          Where applicable, we also follow global data protection principles
          aligned with GDPR standards.
        </p>

        <h2>12. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy periodically. Any changes will be
          reflected on this page with a revised “Last Updated” date.
        </p>
        <p>
          Continued use of the website constitutes acceptance of the updated
          policy.
        </p>

        <h2>13. Contact Information</h2>
        <p>For privacy-related questions or requests, contact:</p>

        <ul>
          <li>
            <strong>CoinMarketBuzz</strong>
          </li>
          <li>
            <a href="mailto:contact@CoinmarketBuzz.com">
              contact@CoinmarketBuzz.com
            </a>
          </li>
          <li>
            <a
              href="https://www.coinmarketbuzz.com"
              target="_blank"
              rel="noreferrer"
            >
              https://www.coinmarketbuzz.com
            </a>
          </li>
        </ul>
      </main>
    </div>
  );
}
