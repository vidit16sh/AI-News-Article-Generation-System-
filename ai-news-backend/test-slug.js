// test-slug.js
const BASE_URL = 'http://localhost:3000/api';

async function testSlugEndpoint() {
  console.log("🔍 1. Fetching latest articles to get a valid slug...");
  
  try {
    // 1. Get list
    const listRes = await fetch(`${BASE_URL}/articles/latest`);
    if (!listRes.ok) throw new Error(`List API failed: ${listRes.status}`);
    
    const articles = await listRes.json();
    
    if (articles.length === 0) {
      console.log("❌ No articles found in DB. Run the workers first!");
      return;
    }

    const targetSlug = articles[0].slug;
    console.log(`✅ Found Slug: "${targetSlug}"`);

    // 2. Test Single Article Endpoint
    console.log(`\n🔍 2. Testing Single Article API: /articles/${targetSlug}`);
    const start = Date.now();
    
    const detailRes = await fetch(`${BASE_URL}/articles/${targetSlug}`);
    const duration = Date.now() - start;

    if (!detailRes.ok) {
      const errText = await detailRes.text();
      throw new Error(`API Error (${detailRes.status}): ${errText}`);
    }

    const data = await detailRes.json();

    // 3. Validate Result
    console.log(`\n✨ SUCCESS (${duration}ms)`);
    console.log("---------------------------------------------------");
    console.log(`📰 Headline:  ${data.article.headline}`);
    console.log(`🔗 Slug:      ${data.article.slug}`);
    console.log(`🏷️  Tags:      ${data.article.tags.join(", ")}`);
    console.log(`🖼️  Image:     ${data.article.imageUrl ? "✅ Yes" : "❌ No"}`);
    console.log(`📄 Content Length: ${data.article.articleHtml.length} characters`);
    console.log(`🔗 Related Articles: ${data.relatedArticles.length} items found`);
    console.log("---------------------------------------------------");

  } catch (error) {
    console.error("❌ TEST FAILED:", error.message);
  }
}

testSlugEndpoint();