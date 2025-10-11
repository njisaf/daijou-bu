module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      url: ['http://localhost:4173'],
      numberOfRuns: 1,
      settings: {
        chromeFlags: ['--no-sandbox', '--headless']
      }
    },
    assert: {
      assertions: {
        // Performance budget assertions
        'resource-summary:script:size': ['error', { maxBytes: 350000 }], // 350KB gzipped JS limit
        'resource-summary:total:size': ['error', { maxBytes: 2000000 }], // 2MB total limit
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }], // 2s FCP
        'largest-contentful-paint': ['error', { maxNumericValue: 4000 }], // 4s LCP on mobile
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // CLS < 0.1
        'speed-index': ['error', { maxNumericValue: 3000 }], // Speed Index < 3s
        'interactive': ['error', { maxNumericValue: 5000 }], // TTI < 5s
        // Accessibility requirements
        'categories:accessibility': ['error', { minScore: 0.9 }], // 90% accessibility score
        // Best practices
        'categories:best-practices': ['error', { minScore: 0.9 }],
        // SEO basics
        'categories:seo': ['error', { minScore: 0.8 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}; 