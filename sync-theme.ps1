# sync-theme-to-admin.ps1
# Automates replicating the style, font, theme tokens, and UI system from sell-digital-assets-website to sell-digital-assets-admin

param(
    [string]$SourceDir = "c:\GH\sell-digital-assets-website",
    [string]$TargetDir = "c:\GH\sell-digital-assets-admin"
)

Write-Host ">>> Starting theme & font synchronization from $SourceDir to $TargetDir..." -ForegroundColor Cyan

# 1. Validate directories
if (-not (Test-Path $SourceDir)) {
    Write-Error "Source directory not found: $SourceDir"
    exit 1
}
if (-not (Test-Path $TargetDir)) {
    Write-Error "Target directory not found: $TargetDir"
    exit 1
}

# 2. Copy Font assets
Write-Host "--> Copying Plus Jakarta Sans font..." -ForegroundColor Yellow
$targetFontDir = Join-Path $TargetDir "src\assets\fonts\plus-jakarta-sans"
New-Item -ItemType Directory -Path $targetFontDir -Force | Out-Null
Copy-Item -Path (Join-Path $SourceDir "src\assets\fonts\plus-jakarta-sans\*") -Destination $targetFontDir -Recurse -Force

# 3. Copy Theme folder (styles, tokens, theme index)
Write-Host "--> Copying theme tokens and stylesheets..." -ForegroundColor Yellow
$targetThemeDir = Join-Path $TargetDir "src\theme"
New-Item -ItemType Directory -Path $targetThemeDir -Force | Out-Null
Copy-Item -Path (Join-Path $SourceDir "src\theme\*") -Destination $targetThemeDir -Recurse -Force

# 4. Copy Context, Hooks, and Providers
Write-Host "--> Copying ThemeContext, useTheme hook, and ThemeProvider..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path (Join-Path $TargetDir "src\context") -Force | Out-Null
Copy-Item -Path (Join-Path $SourceDir "src\context\themeContext.ts") -Destination (Join-Path $TargetDir "src\context\themeContext.ts") -Force

New-Item -ItemType Directory -Path (Join-Path $TargetDir "src\hooks") -Force | Out-Null
Copy-Item -Path (Join-Path $SourceDir "src\hooks\useTheme.ts") -Destination (Join-Path $TargetDir "src\hooks\useTheme.ts") -Force

New-Item -ItemType Directory -Path (Join-Path $TargetDir "src\provider") -Force | Out-Null
Copy-Item -Path (Join-Path $SourceDir "src\provider\ThemeProvider.tsx") -Destination (Join-Path $TargetDir "src\provider\ThemeProvider.tsx") -Force

# 5. Copy Lib utils and Icons
Write-Host "--> Copying lib utils (cn) and icons namespace..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path (Join-Path $TargetDir "src\lib") -Force | Out-Null
Copy-Item -Path (Join-Path $SourceDir "src\lib\utils.ts") -Destination (Join-Path $TargetDir "src\lib\utils.ts") -Force

$targetIconsDir = Join-Path $TargetDir "src\lib\icons"
New-Item -ItemType Directory -Path $targetIconsDir -Force | Out-Null
Copy-Item -Path (Join-Path $SourceDir "src\lib\icons\*") -Destination $targetIconsDir -Recurse -Force

# 6. Copy UI Components
Write-Host "--> Copying UI component primitives (Button, Card, Badge, Input, etc.)..." -ForegroundColor Yellow
$targetUiDir = Join-Path $TargetDir "src\components\ui"
New-Item -ItemType Directory -Path $targetUiDir -Force | Out-Null
Copy-Item -Path (Join-Path $SourceDir "src\components\ui\*") -Destination $targetUiDir -Recurse -Force

# 7. Update index.css
Write-Host "--> Updating src/index.css with Tailwind v4 & theme imports..." -ForegroundColor Yellow
Copy-Item -Path (Join-Path $SourceDir "src\index.css") -Destination (Join-Path $TargetDir "src\index.css") -Force

# 8. Update vite.config.ts with @ path alias
Write-Host "--> Configuring path alias (@) in vite.config.ts..." -ForegroundColor Yellow
$viteConfigContent = @'
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
'@
Set-Content -Path (Join-Path $TargetDir "vite.config.ts") -Value $viteConfigContent -Encoding utf8

# 9. Update tsconfig.app.json with paths
Write-Host "--> Updating tsconfig.app.json path mapping..." -ForegroundColor Yellow
$tsconfigPath = Join-Path $TargetDir "tsconfig.app.json"
$tsconfigContent = @'
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]
    },
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
'@
Set-Content -Path $tsconfigPath -Value $tsconfigContent -Encoding utf8

# 10. Update index.html for FOUC prevention & body styling
Write-Host "--> Updating index.html with theme bootstrap & antialiasing..." -ForegroundColor Yellow
$indexHtmlPath = Join-Path $TargetDir "index.html"
$indexHtmlContent = @'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sell Digital Assets - Admin Portal</title>
    <!-- Synchronous theme detection to prevent FOUC -->
    <script>
      (function () {
        try {
          const stored = localStorage.getItem("theme");
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          const theme = stored === "dark" || stored === "light" ? stored : (prefersDark ? "dark" : "light");
          if (theme === "dark") {
            document.documentElement.classList.add("dark");
            document.documentElement.setAttribute("data-theme", "dark");
          } else {
            document.documentElement.classList.remove("dark");
            document.documentElement.setAttribute("data-theme", "light");
          }
        } catch (_) {}
      })();
    </script>
  </head>
  <body class="bg-background text-on-surface antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
'@
Set-Content -Path $indexHtmlPath -Value $indexHtmlContent -Encoding utf8

# 11. Wrap main.tsx with ThemeProvider
Write-Host "--> Wrapping src/main.tsx with ThemeProvider..." -ForegroundColor Yellow
$mainTsxContent = @'
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./provider/ThemeProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
'@
Set-Content -Path (Join-Path $TargetDir "src\main.tsx") -Value $mainTsxContent -Encoding utf8

# 12. Create a modern themed App.tsx showcase
Write-Host "--> Generating styled App.tsx preview in admin..." -ForegroundColor Yellow
$appTsxContent = @'
import { useTheme } from "@/hooks/useTheme.ts";
import { Icons } from "@/lib/icons/index.ts";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@/components/ui/index.ts";

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col transition-colors duration-200">
      {/* Top Bar */}
      <header className="border-b border-outline-variant/30 bg-surface/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 font-bold text-lg tracking-tight text-on-surface">
            <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center">
              <Icons.Brand size={18} />
            </div>
            <span>
              Asset<span className="text-primary-container font-extrabold">Drop</span> Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              {theme === "dark" ? <Icons.ThemeLight size={19} /> : <Icons.ThemeDark size={19} />}
            </button>
            <Badge variant="primary" size="sm">Admin Portal</Badge>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <Badge variant="secondary" size="md" className="gap-1 mb-3">
            <Icons.Magic size={14} /> Design System Active
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Admin Theme &amp; Typography Synced
          </h1>
          <p className="mt-2 text-on-surface-variant text-base max-w-2xl">
            This dashboard uses Plus Jakarta Sans, Tailwind v4 design tokens, and the Material-inspired color palette from the main website.
          </p>
        </div>

        {/* Component Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.Performance size={18} className="text-primary" /> Active Theme Mode
              </CardTitle>
              <CardDescription>System appearance preference</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-on-surface-variant">
                Current mode: <strong className="text-on-surface capitalize font-semibold">{theme}</strong>
              </p>
              <Button variant="primary" size="md" onClick={toggleTheme} className="w-full">
                Toggle to {theme === "dark" ? "Light" : "Dark"} Mode
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.Security size={18} className="text-primary" /> Surface Hierarchy
              </CardTitle>
              <CardDescription>Tailwind v4 token demonstration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-surface-container-low text-on-surface flex justify-between">
                <span>surface-container-low</span>
                <span className="font-mono">Card Low</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-high text-on-surface flex justify-between">
                <span>surface-container-high</span>
                <span className="font-mono">Card High</span>
              </div>
              <div className="p-2.5 rounded-lg bg-primary-container text-on-primary-container font-semibold flex justify-between">
                <span>primary-container</span>
                <span className="font-mono">Accent</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.Categories size={18} className="text-primary" /> Typography Scale
              </CardTitle>
              <CardDescription>Plus Jakarta Sans font weights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="font-normal text-on-surface-variant">Regular (400) Body text</div>
              <div className="font-medium text-on-surface">Medium (500) Interface labels</div>
              <div className="font-semibold text-on-surface">SemiBold (600) Card headers</div>
              <div className="font-bold text-primary">Bold (700) Display hero accents</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
'@
# 12. Configure App.tsx with Toaster if needed
$appTsxPath = Join-Path $TargetDir "src\App.tsx"
if (Test-Path $appTsxPath) {
    $existingApp = Get-Content $appTsxPath -Raw
    if (-not ($existingApp -match "from [""']sonner[""']")) {
        Write-Host "--> Injecting Sonner Toaster into existing App.tsx..." -ForegroundColor Yellow
        $existingApp = "import { Toaster } from ""sonner"";`n" + $existingApp
        $existingApp = $existingApp -replace "(</>\s*\);\s*})", "  <Toaster position=""bottom-right"" theme={theme} richColors closeButton toastOptions={{ className: ""font-sans rounded-2xl shadow-lg border border-outline-variant/30"" }} />`n`$1"
        Set-Content -Path $appTsxPath -Value $existingApp -Encoding utf8
    }
}

# 13. Ensure lucide-react & sonner are installed in TargetDir
Write-Host "--> Checking required npm dependencies in $TargetDir..." -ForegroundColor Yellow
$targetPackageJson = Get-Content (Join-Path $TargetDir "package.json") -Raw | ConvertFrom-Json
$missingPackages = @()
if (-not $targetPackageJson.dependencies."lucide-react") { $missingPackages += "lucide-react" }
if (-not $targetPackageJson.dependencies."sonner") { $missingPackages += "sonner@^2.0.8" }

if ($missingPackages.Count -gt 0) {
    Write-Host "--> Installing missing packages: $($missingPackages -join ', ') in $TargetDir..." -ForegroundColor Yellow
    Push-Location $TargetDir
    try {
        npm install $missingPackages --save
    } finally {
        Pop-Location
    }
}

Write-Host ">>> Synchronization complete! Theme, font, and design system are live in $TargetDir." -ForegroundColor Green
