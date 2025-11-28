import fs from 'fs';
import 'dotenv/config';

const BASE_URL = 'http://localhost:3000/api';

async function generatePreview() {
  console.log("🔍 Fetching latest article...");
  
  try {
    // 1. Get List
    const listRes = await fetch(`${BASE_URL}/articles/latest`);
    const articles = await listRes.json();

    if (articles.length === 0) {
      console.log("❌ No articles found.");
      return;
    }

    const slug = articles[0].slug;
    console.log(`📄 Fetching full content for: ${slug}`);

    // 2. Get Detail
    const detailRes = await fetch(`${BASE_URL}/articles/${slug}`);
    const data = await detailRes.json();
    const { article } = data;

    // 3. Create HTML Template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${article.headline}</title>
        <style>
          body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
          img { max-width: 100%; height: auto; border-radius: 10px; margin-bottom: 20px; }
          h1 { font-size: 40px; margin-bottom: 10px; }
          .meta { color: #666; font-size: 0.9rem; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px;}
          .tag { background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; margin-right: 5px;}
          /* This mimics the Tailwind typography plugin */
          h2 { margin-top: 30px; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; }
          ul { background: #f9fafb; padding: 20px 40px; border-radius: 8px; }
          li { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        ${article.imageUrl ? `<img src="${article.imageUrl}" alt="AI Image" />` : ''}
        <h1>${article.headline}</h1>
        
        <div class="meta">
          <p><strong>Scores:</strong> Originality: ${(article.originalityScore * 100).toFixed(0)}% | Confidence: ${(article.confidenceScore * 100).toFixed(0)}%</p>
          <div>
            ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        </div>

        ${article.articleHtml}

      </body>
      </html>
    `;

    // 4. Save file
    fs.writeFileSync('preview.html', htmlContent);
    console.log("\n✅ Success! Created 'preview.html'");
    console.log("👉 Go open this file in your folder to read the article!");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

generatePreview();