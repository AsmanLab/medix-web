module.exports = {
  ci: {
    collect: {
      // Vite SPA: preview has history fallback for client routes.
      startServerCommand: "npm run preview -- --host 127.0.0.1 --port 4173",
      startServerReadyPattern: "Local:",
      url: [
        "http://127.0.0.1:4173/",
        "http://127.0.0.1:4173/catalog",
        "http://127.0.0.1:4173/contacts",
      ],
      numberOfRuns: 3,
      settings: {
        // Lab proxy for interactivity; FID itself needs field data.
        onlyCategories: ["performance"],
      },
    },
    assert: {
      assertions: {
        // Issue #36: LCP < 3s, CLS < 0.1, FID < 100ms.
        // Lab uses total-blocking-time as FID/INP proxy (FID needs field data).
        "largest-contentful-paint": ["error", { maxNumericValue: 3000 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["error", { maxNumericValue: 200 }],
        // Noise off for static preview / CI
        "uses-http2": "off",
        "bf-cache": "off",
        "csp-xss": "off",
        "color-contrast": "off",
        "tap-targets": "off",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
