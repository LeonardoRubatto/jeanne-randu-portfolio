import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://example.com/', lastModified: '2026-09-01', priority: 1 },
    { url: 'https://example.com/mentions-legales', lastModified: '2026-09-01', priority: 0.3 },
  ];
}
