import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | CoinMarketBuzz",
  description: "Privacy Policy for CoinMarketBuzz outlining how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-slate-900">Privacy Policy</h1>
      
      <div className="prose prose-slate max-w-none text-slate-600">
        <p className="text-sm text-slate-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Introduction</h2>
          <p>
            Welcome to CoinMarketBuzz. We respect your privacy and are committed to protecting your personal data. 
            This privacy policy will inform you as to how we look after your personal data when you visit our website 
            and tell you about your privacy rights and how the law protects you.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Data We Collect</h2>
          <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
            <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
            <li><strong>Technical Data:</strong> includes internet protocol (IP) address, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform.</li>
            <li><strong>Usage Data:</strong> includes information about how you use our website, products and services.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">3. How We Use Your Data</h2>
          <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>To provide and maintain our Service.</li>
            <li>To notify you about changes to our Service.</li>
            <li>To provide customer support.</li>
            <li>To gather analysis or valuable information so that we can improve the Service.</li>
            <li>To monitor the usage of the Service.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Cookies</h2>
          <p>
            You can set your browser to refuse all or some browser cookies, or to alert you when websites set or access cookies. 
            If you disable or refuse cookies, please note that some parts of this website may become inaccessible or not function properly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>By email: <a href="mailto:privacy@coinmarketbuzz.com" className="text-blue-600 hover:underline">privacy@coinmarketbuzz.com</a></li>
            <li>By visiting this page on our website: <Link href="/contact" className="text-blue-600 hover:underline">Contact Us</Link></li>
          </ul>
        </section>
      </div>
    </div>
  );
}