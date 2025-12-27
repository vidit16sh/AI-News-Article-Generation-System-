// src/app/disclaimer/page.js

export const metadata = {
  title: "Disclaimer - CoinMarketBuzz",
  description:
    "Read the official disclaimer of CoinMarketBuzz regarding financial information, accuracy, sponsored content, and external links.",
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-12">
      {/* Page Title */}
      <h1 className="text-3xl font-bold text-slate-900">
        Disclaimer
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        Last Updated: <span className="italic">[Insert Date]</span>
      </p>

      {/* Intro */}
      <p className="mt-6 text-base leading-7 text-slate-700">
        The information published on CoinMarketBuzz.com is for general
        informational and educational purposes only.
      </p>

      {/* What we do not provide */}
      <h2 className="mt-8 text-xl font-semibold text-slate-900">
        No Financial or Professional Advice
      </h2>

      <p className="mt-3 text-base leading-7 text-slate-700">
        CoinMarketBuzz does not provide:
      </p>

      <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-slate-700">
        <li>Financial advice</li>
        <li>Investment advice</li>
        <li>Trading recommendations</li>
        <li>Legal or tax advice</li>
      </ul>

      <p className="mt-4 text-base leading-7 text-slate-700">
        Cryptocurrency and digital asset markets are volatile and involve
        significant risk. Readers are strongly advised to conduct their own
        research and consult qualified professionals before making any financial
        decisions.
      </p>

      {/* Accuracy & Liability */}
      <h2 className="mt-10 text-xl font-semibold text-slate-900">
        Accuracy &amp; Liability
      </h2>

      <p className="mt-3 text-base leading-7 text-slate-700">
        While we strive for accuracy, CoinMarketBuzz makes no representations or
        warranties regarding the completeness, reliability, or accuracy of any
        content published on this website.
      </p>

      <p className="mt-4 text-base leading-7 text-slate-700">
        Any action you take based on information from this website is strictly at
        your own risk. CoinMarketBuzz shall not be held liable for any losses or
        damages arising from the use of our content.
      </p>

      {/* Sponsored Content */}
      <h2 className="mt-10 text-xl font-semibold text-slate-900">
        Sponsored &amp; Press Release Content
      </h2>

      <p className="mt-3 text-base leading-7 text-slate-700">
        Some content published on CoinMarketBuzz may include:
      </p>

      <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-slate-700">
        <li>Sponsored articles</li>
        <li>Press releases</li>
        <li>Promotional material</li>
      </ul>

      <p className="mt-4 text-base leading-7 text-slate-700">
        Such content is always clearly labeled. CoinMarketBuzz does not endorse
        any project, product, or service unless explicitly stated.
      </p>

      {/* External Links */}
      <h2 className="mt-10 text-xl font-semibold text-slate-900">
        External Links
      </h2>

      <p className="mt-3 text-base leading-7 text-slate-700">
        CoinMarketBuzz may include links to third-party websites. We are not
        responsible for the content, accuracy, policies, or practices of any
        external sites.
      </p>

      {/* Contact */}
      <h2 className="mt-10 text-xl font-semibold text-slate-900">
        Contact
      </h2>

      <p className="mt-3 text-base leading-7 text-slate-700">
        For questions regarding this disclaimer, please contact us at:
      </p>

      <p className="mt-2 text-base font-medium text-slate-900">
        <a
          href="mailto:Contact@CoinmarketBuzz.com"
          className="text-blue-600 hover:underline"
        >
          contact@CoinmarketBuzz.com
        </a>
      </p>
    </div>
  );
}
