import type { Mode } from "@/lib/types";
import type { RoleFileManifest } from "./types";

export const ROLE_TOKEN_BUDGETS: Record<Mode, number> = {
  founder: 30000,
  dev:     40000,
  "qa-eng": 30000,
  sales:   25000,
};

// Base files every role always loads first (project identity)
export const BASE_PRIORITY_FILES = [
  "README.md", "README.txt", "README",
  "package.json", "pyproject.toml", "Cargo.toml", "go.mod",
];

// Base source patterns every role loads as fallback (understand the actual product)
export const BASE_SOURCE_PATTERNS = [
  "src/**/*.ts", "src/**/*.tsx", "src/**/*.js", "src/**/*.jsx",
  "src/**/*.py", "src/**/*.go", "src/**/*.rs",
  "app/**/*.ts", "app/**/*.tsx",
  "lib/**/*.ts", "lib/**/*.py",
  "pages/**/*.tsx", "pages/**/*.ts",
  "components/**/*.tsx", "components/**/*.ts",
];

export const ROLE_FILE_MANIFESTS: Record<Mode, RoleFileManifest> = {
  founder: {
    priorityFiles: [
      ...BASE_PRIORITY_FILES,
      "ROADMAP.md", "ROADMAP.txt",
      "CHANGELOG.md", "CHANGELOG.txt", "HISTORY.md",
      "docs/architecture.md", "docs/overview.md", "docs/product.md",
      "docs/README.md", "CONTRIBUTING.md",
      "tsconfig.json",                      // tech stack signal
    ],
    patterns: [
      "docs/**/*.md", "*.md",               // all docs
      ...BASE_SOURCE_PATTERNS,              // understand actual product
    ],
    excludePatterns: ["node_modules", ".git", "dist", "build", ".next", "*.lock", "*.log"],
    maxFilesPerPattern: 10,
    perFileTokenLimit: 3000,
  },

  dev: {
    priorityFiles: [
      ...BASE_PRIORITY_FILES,
      "tsconfig.json", "tsconfig.base.json",
      "Dockerfile", "docker-compose.yml",
      ".env.example",
      "next.config.ts", "next.config.js",
      "vite.config.ts", "webpack.config.js",
      "ARCHITECTURE.md", "docs/architecture.md",
      "requirements.txt", "setup.py",
    ],
    patterns: [
      ...BASE_SOURCE_PATTERNS,
      "server/**/*.ts", "server/**/*.py",
      "api/**/*.ts", "api/**/*.py",
      "hooks/**/*.ts", "utils/**/*.ts",
      "models/**/*.py", "routes/**/*.py",
      ".github/workflows/*.yml",
    ],
    excludePatterns: [
      "node_modules", ".git", "dist", "build", ".next",
      "*.lock", "*.min.js", "*.map", "*.d.ts",
      "**/*.test.*", "**/*.spec.*", "**/__tests__/**",
    ],
    maxFilesPerPattern: 15,
    perFileTokenLimit: 2500,
  },

  "qa-eng": {
    priorityFiles: [
      ...BASE_PRIORITY_FILES,
      ".github/workflows/ci.yml", ".github/workflows/test.yml",
      "jest.config.ts", "jest.config.js",
      "vitest.config.ts", "pytest.ini", "setup.cfg",
      "playwright.config.ts", "cypress.config.ts",
    ],
    patterns: [
      "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx",
      "**/__tests__/**/*.ts", "**/__tests__/**/*.tsx",
      "tests/**/*.py", "test/**/*.py",
      ".github/workflows/*.yml",
      ...BASE_SOURCE_PATTERNS,              // understand what to test
    ],
    excludePatterns: ["node_modules", ".git", "dist", "build", ".next", "*.lock"],
    maxFilesPerPattern: 15,
    perFileTokenLimit: 2000,
  },

  sales: {
    priorityFiles: [
      ...BASE_PRIORITY_FILES,
      "CHANGELOG.md", "ROADMAP.md",
      "docs/index.md", "docs/overview.md", "docs/getting-started.md",
    ],
    patterns: [
      "docs/**/*.md", "*.md",               // all docs
      "website/**/*.mdx", "landing/**/*.md", "content/**/*.md",
      ...BASE_SOURCE_PATTERNS,              // understand actual product features
    ],
    excludePatterns: ["node_modules", ".git", "dist", "build", ".next", "*.lock"],
    maxFilesPerPattern: 10,
    perFileTokenLimit: 2500,
  },
};

export const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".mp4", ".mp3", ".wav", ".mov",
  ".zip", ".tar", ".gz", ".rar",
  ".pdf", ".exe", ".bin", ".dmg",
  ".pyc", ".pyo", ".class",
]);
