// Caminhos internos do repositório: não devem ser servidos ao público.
// Usado pelo middleware (404) e combinado com o passo de deploy que tira
// esses arquivos da pasta publicada.

const EXT = new Set([
  "sql", "toml", "md", "py", "sh", "env", "yml", "yaml",
  "lock", "makefile",
]);

const NAMES = new Set([
  "gitignore", "gitattributes", "gitmodules", "gitkeep",
  "dev.vars", "npmrc", "nvmrc", "editorconfig",
  "wrangler.toml", "wrangler.json", "wrangler.jsonc",
  "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "tsconfig.json", "jsconfig.json", "cargo.toml", "go.mod", "go.sum",
  "readme", "readme.md", "license", "licence", "changelog", "changelog.md",
  "makefile", "dockerfile", "docker-compose.yml", "docker-compose.yaml",
  "eslint.config.js", "vite.config.js", "webpack.config.js",
  "strip-deploy.sh",
]);

function normalizePath(pathname) {
  let s = String(pathname || "/");
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep raw */
  }
  s = s.replace(/\\/g, "/");
  const parts = [];
  for (const raw of s.split("/")) {
    if (!raw || raw === ".") continue;
    if (raw === "..") parts.pop();
    else parts.push(raw);
  }
  return "/" + parts.join("/").toLowerCase();
}

export function isPrivatePath(pathname) {
  const p = normalizePath(pathname);
  if (p === "/") return false;
  const segs = p.slice(1).split("/");
  const base = segs[segs.length - 1] || "";
  const name = base.replace(/^\./, "");

  if (NAMES.has(base) || NAMES.has(name)) return true;
  if (name === "env" || name.startsWith("env.")) return true; // .env, .env.local, env.example

  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot + 1) : "";
  if (EXT.has(ext)) return true;
  if (base.endsWith(".test.js") || base.endsWith(".spec.js")) return true;

  if (p === "/functions" || p.startsWith("/functions/")) return true;
  if (p === "/scripts" || p.startsWith("/scripts/")) return true;
  if (p === "/wiki/fonte" || p.startsWith("/wiki/fonte/")) return true;
  if (p === "/wiki/build.py") return true;
  if (p === "/.git" || p.startsWith("/.git/")) return true;
  if (p === "/.github" || p.startsWith("/.github/")) return true;
  if (p === "/docs" || p.startsWith("/docs/")) return true;
  if (p === "/test" || p.startsWith("/test/") || p === "/tests" || p.startsWith("/tests/")) return true;
  if (p.includes("/__tests__/")) return true;

  return false;
}

export function privateNotFound() {
  return new Response("Página não encontrada.", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
