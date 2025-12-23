export const metadata = { title: "Contact Us - CoinMarketBuzz" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
        <p className="mb-4"><strong>Editorial Team:</strong> contact@coinmarketbuzz.com</p>
        <p className="mb-4"><strong>Phone:</strong> +91 97603 95655</p>
        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            <strong>Headquarters:</strong><br/>
            C-14, Giriraj Society, Ekta Nagar, New Sama,<br/>
            Vadodara, Gujarat 39002
          </p>
        </div>
      </div>
    </div>
  );
}