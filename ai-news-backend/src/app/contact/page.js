export const metadata = { title: "Contact Us - CoinMarketBuzz" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
        <p className="mb-4"><strong>Editorial Team:</strong> editor@coinmarketbuzz.com</p>
        <p className="mb-4"><strong>Press Inquiries:</strong> press@coinmarketbuzz.com</p>
        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            <strong>Headquarters:</strong><br/>
            123 Crypto Plaza, Suite 400<br/>
            New York, NY 10001, USA
          </p>
        </div>
      </div>
    </div>
  );
}