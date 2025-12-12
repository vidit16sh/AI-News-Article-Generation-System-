export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/admin/', '/private/'], // Protect admin routes
    },
    // This points Google to your Dynamic Sitemap index
    sitemap: `${baseUrl}/api/feed/sitemap.xml`,
  }
}