export const metadata = {
  title: "About Us - CoinMarketBuzz",
  description: "Learn about our AI-driven approach to financial news."
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-12 prose prose-slate">
      <h1>About CoinMarketBuzz</h1>
      <p>CoinMarketBuzz is a next-generation financial news platform leveraging advanced Artificial Intelligence to deliver real-time insights into the cryptocurrency and global finance markets.</p>
      
      <h2>Our Methodology</h2>
      <p>Our editorial team uses AI assistive technology to analyze thousands of data points daily. All content is fact-checked and reviewed to ensure accuracy and neutrality.</p>
      
      <h2>Ethics Policy</h2>
      <p>We are committed to transparency. Articles generated with the assistance of AI are clearly marked, and our human editors oversee all publication decisions.</p>
    </div>
  );
}