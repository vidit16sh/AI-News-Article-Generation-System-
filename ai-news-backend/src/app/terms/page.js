import Link from "next/link";

export const metadata = {
  title: "Terms of Service | CoinMarketBuzz",
  description: "Terms and conditions for using CoinMarketBuzz.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-slate-900">Terms of Service</h1>
      
      <div className="prose prose-slate max-w-none text-slate-600">
        <p className="text-sm text-slate-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the CoinMarketBuzz website, you agree to be bound by these Terms of Service and all applicable laws and regulations. 
            If you do not agree with any of these terms, you are prohibited from using or accessing this site.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Use License</h2>
          <p>
            Permission is granted to temporarily download one copy of the materials (information or software) on CoinMarketBuzz's website for personal, 
            non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Modify or copy the materials;</li>
            <li>Use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
            <li>Attempt to decompile or reverse engineer any software contained on CoinMarketBuzz's website;</li>
            <li>Remove any copyright or other proprietary notations from the materials; or</li>
            <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Disclaimer</h2>
          <p>
            The materials on CoinMarketBuzz's website are provided on an 'as is' basis. CoinMarketBuzz makes no warranties, expressed or implied, 
            and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, 
            fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
          <p className="mt-4 font-medium text-slate-800 bg-slate-100 p-4 rounded-md">
            <strong>Financial Disclaimer:</strong> CoinMarketBuzz is a news and information platform. Nothing on this website constitutes financial advice. 
            Cryptocurrency investments carry significant risk. Always conduct your own research before making investment decisions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Limitations</h2>
          <p>
            In no event shall CoinMarketBuzz or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, 
            or due to business interruption) arising out of the use or inability to use the materials on CoinMarketBuzz's website.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Governing Law</h2>
          <p>
            These terms and conditions are governed by and construed in accordance with the laws of the State of New York and you irrevocably submit to 
            the exclusive jurisdiction of the courts in that State or location.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at <a href="mailto:legal@coinmarketbuzz.com" className="text-blue-600 hover:underline">legal@coinmarketbuzz.com</a>.</p>
        </section>
      </div>
    </div>
  );
}