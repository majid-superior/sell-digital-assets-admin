import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Icons } from "@/lib/icons/index.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  Label,
  Spinner,
} from "@/components/ui/index.ts";
import {
  themeService,
  ThemeServiceError,
  applyThemeToDom,
  type ActiveThemeData,
  type ColorHexMap,
} from "@/services/index.ts";

interface PalettePreset {
  name: string;
  description: string;
  preview: string;
  colorHexMap: ColorHexMap;
}

const PRESET_PALETTES: PalettePreset[] = [
  {
    name: "Amber Flame (Default)",
    description: "Original brand identity with high-contrast amber and forest accents",
    preview: "#ae3200",
    colorHexMap: {
      light: {
        primary: "#ae3200",
        primaryContainer: "#ff5a1f",
        onPrimary: "#ffffff",
        onPrimaryContainer: "#541400",
        secondary: "#006c45",
        secondaryContainer: "#86f9bc",
        onSecondary: "#ffffff",
        tertiary: "#005ac2",
        tertiaryContainer: "#508fff",
      },
      dark: {
        primary: "#ffb59e",
        primaryContainer: "#ff5a1f",
        onPrimary: "#5c1900",
        onPrimaryContainer: "#ffdbd0",
        secondary: "#69dca1",
        secondaryContainer: "#005233",
        onSecondary: "#003922",
        tertiary: "#adc6ff",
        tertiaryContainer: "#004395",
      },
    },
  },
  {
    name: "Royal Indigo",
    description: "Modern enterprise look with deep indigo and emerald highlights",
    preview: "#4338ca",
    colorHexMap: {
      light: {
        primary: "#4338ca",
        primaryContainer: "#6366f1",
        onPrimary: "#ffffff",
        onPrimaryContainer: "#1e1b4b",
        secondary: "#059669",
        secondaryContainer: "#a7f3d0",
        onSecondary: "#ffffff",
        tertiary: "#0284c7",
        tertiaryContainer: "#38bdf8",
      },
      dark: {
        primary: "#818cf8",
        primaryContainer: "#4338ca",
        onPrimary: "#1e1b4b",
        onPrimaryContainer: "#c7d2fe",
        secondary: "#34d399",
        secondaryContainer: "#065f46",
        onSecondary: "#022c22",
        tertiary: "#38bdf8",
        tertiaryContainer: "#0369a1",
      },
    },
  },
  {
    name: "Emerald Forest",
    description: "Clean fintech aesthetic with vibrant emerald and amber warmth",
    preview: "#047857",
    colorHexMap: {
      light: {
        primary: "#047857",
        primaryContainer: "#10b981",
        onPrimary: "#ffffff",
        onPrimaryContainer: "#022c22",
        secondary: "#d97706",
        secondaryContainer: "#fde68a",
        onSecondary: "#ffffff",
        tertiary: "#2563eb",
        tertiaryContainer: "#60a5fa",
      },
      dark: {
        primary: "#34d399",
        primaryContainer: "#047857",
        onPrimary: "#022c22",
        onPrimaryContainer: "#a7f3d0",
        secondary: "#fbbf24",
        secondaryContainer: "#92400e",
        onSecondary: "#451a03",
        tertiary: "#60a5fa",
        tertiaryContainer: "#1e40af",
      },
    },
  },
  {
    name: "Crimson Scarlet",
    description: "Bold scarlet tones with refined indigo and cyan complementary tokens",
    preview: "#be123c",
    colorHexMap: {
      light: {
        primary: "#be123c",
        primaryContainer: "#f43f5e",
        onPrimary: "#ffffff",
        onPrimaryContainer: "#4c0519",
        secondary: "#4f46e5",
        secondaryContainer: "#c7d2fe",
        onSecondary: "#ffffff",
        tertiary: "#0891b2",
        tertiaryContainer: "#22d3ee",
      },
      dark: {
        primary: "#fb7185",
        primaryContainer: "#be123c",
        onPrimary: "#4c0519",
        onPrimaryContainer: "#fecdd3",
        secondary: "#818cf8",
        secondaryContainer: "#3730a3",
        onSecondary: "#1e1b4b",
        tertiary: "#22d3ee",
        tertiaryContainer: "#155e75",
      },
    },
  },
  {
    name: "Cyber Violet",
    description: "Futuristic purple styling with vibrant sky and rose highlights",
    preview: "#6d28d9",
    colorHexMap: {
      light: {
        primary: "#6d28d9",
        primaryContainer: "#8b5cf6",
        onPrimary: "#ffffff",
        onPrimaryContainer: "#2e1065",
        secondary: "#0284c7",
        secondaryContainer: "#bae6fd",
        onSecondary: "#ffffff",
        tertiary: "#e11d48",
        tertiaryContainer: "#fb7185",
      },
      dark: {
        primary: "#a78bfa",
        primaryContainer: "#6d28d9",
        onPrimary: "#2e1065",
        onPrimaryContainer: "#ddd6fe",
        secondary: "#38bdf8",
        secondaryContainer: "#075985",
        onSecondary: "#082f49",
        tertiary: "#f43f5e",
        tertiaryContainer: "#9f1239",
      },
    },
  },
  {
    name: "Ocean Cobalt",
    description: "Crisp blue palette engineered for high accessibility and clarity",
    preview: "#0284c7",
    colorHexMap: {
      light: {
        primary: "#0284c7",
        primaryContainer: "#0ea5e9",
        onPrimary: "#ffffff",
        onPrimaryContainer: "#082f49",
        secondary: "#16a34a",
        secondaryContainer: "#bbf7d0",
        onSecondary: "#ffffff",
        tertiary: "#d97706",
        tertiaryContainer: "#fbbf24",
      },
      dark: {
        primary: "#38bdf8",
        primaryContainer: "#0284c7",
        onPrimary: "#082f49",
        onPrimaryContainer: "#bae6fd",
        secondary: "#4ade80",
        secondaryContainer: "#166534",
        onSecondary: "#052e16",
        tertiary: "#fbbf24",
        tertiaryContainer: "#92400e",
      },
    },
  },
  {
    name: "Nordic Frost",
    description: "Iconic Arctic palette with polar frost blues, glacier teal, and aurora green",
    preview: "#5e81ac",
    colorHexMap: {
      light: {
        primary: "#5e81ac",
        primaryContainer: "#81a1c1",
        onPrimary: "#ffffff",
        onPrimaryContainer: "#2e3440",
        secondary: "#8fbcbb",
        secondaryContainer: "#d8dee9",
        onSecondary: "#2e3440",
        tertiary: "#d08770",
        tertiaryContainer: "#ebcb8b",
      },
      dark: {
        primary: "#88c0d0",
        primaryContainer: "#5e81ac",
        onPrimary: "#2e3440",
        onPrimaryContainer: "#eceff4",
        secondary: "#a3be8c",
        secondaryContainer: "#3b4252",
        onSecondary: "#2e3440",
        tertiary: "#ebcb8b",
        tertiaryContainer: "#4c566a",
      },
    },
  },
  {
    name: "Dracula Night",
    description: "World-renowned developer aesthetic with radiant purple, spring green, and pink",
    preview: "#7952b3",
    colorHexMap: {
      light: {
        primary: "#7952b3",
        primaryContainer: "#9b6ecc",
        onPrimary: "#ffffff",
        onPrimaryContainer: "#282a36",
        secondary: "#00a896",
        secondaryContainer: "#bbf7d0",
        onSecondary: "#ffffff",
        tertiary: "#d63384",
        tertiaryContainer: "#fce7f3",
      },
      dark: {
        primary: "#bd93f9",
        primaryContainer: "#7952b3",
        onPrimary: "#282a36",
        onPrimaryContainer: "#f8f8f2",
        secondary: "#50fa7b",
        secondaryContainer: "#1b4332",
        onSecondary: "#191a21",
        tertiary: "#ff79c6",
        tertiaryContainer: "#6272a4",
      },
    },
  },
  {
    name: "Sunset Horizon",
    description: "Warm sunset glow blending coral rose, sunburst orange, and twilight violet",
    preview: "#e11d48",
    colorHexMap: {
      light: {
        primary: "#e11d48",
        primaryContainer: "#f43f5e",
        onPrimary: "#ffffff",
        onPrimaryContainer: "#4c0519",
        secondary: "#ea580c",
        secondaryContainer: "#ffedd5",
        onSecondary: "#ffffff",
        tertiary: "#7c3aed",
        tertiaryContainer: "#ede9fe",
      },
      dark: {
        primary: "#fb7185",
        primaryContainer: "#e11d48",
        onPrimary: "#4c0519",
        onPrimaryContainer: "#ffe4e6",
        secondary: "#fb923c",
        secondaryContainer: "#7c2d12",
        onSecondary: "#431407",
        tertiary: "#c084fc",
        tertiaryContainer: "#4c1d95",
      },
    },
  },
  {
    name: "Obsidian & Gold",
    description: "Prestigious luxury aesthetic featuring warm champagne gold and titanium slate",
    preview: "#b45309",
    colorHexMap: {
      light: {
        primary: "#b45309",
        primaryContainer: "#d97706",
        onPrimary: "#ffffff",
        onPrimaryContainer: "#451a03",
        secondary: "#475569",
        secondaryContainer: "#e2e8f0",
        onSecondary: "#ffffff",
        tertiary: "#0369a1",
        tertiaryContainer: "#e0f2fe",
      },
      dark: {
        primary: "#fbbf24",
        primaryContainer: "#b45309",
        onPrimary: "#451a03",
        onPrimaryContainer: "#fef3c7",
        secondary: "#94a3b8",
        secondaryContainer: "#334155",
        onSecondary: "#0f172a",
        tertiary: "#38bdf8",
        tertiaryContainer: "#075985",
      },
    },
  },
  {
    name: "Tokyo Neon",
    description: "Electric cyberpunk styling with neon fuchsia, laser cyan, and luminous amber",
    preview: "#c026d3",
    colorHexMap: {
      light: {
        primary: "#c026d3",
        primaryContainer: "#e879f9",
        onPrimary: "#ffffff",
        onPrimaryContainer: "#4a044e",
        secondary: "#0891b2",
        secondaryContainer: "#cffafe",
        onSecondary: "#ffffff",
        tertiary: "#ca8a04",
        tertiaryContainer: "#fef9c3",
      },
      dark: {
        primary: "#e879f9",
        primaryContainer: "#a21caf",
        onPrimary: "#4a044e",
        onPrimaryContainer: "#fae8ff",
        secondary: "#22d3ee",
        secondaryContainer: "#155e75",
        onSecondary: "#083344",
        tertiary: "#fde047",
        tertiaryContainer: "#713f12",
      },
    },
  },
  {
    name: "Teal Matrix",
    description: "Sophisticated developer aesthetic balancing deep sea teal, sky blue, and coral",
    preview: "#0f766e",
    colorHexMap: {
      light: {
        primary: "#0f766e",
        primaryContainer: "#14b8a6",
        onPrimary: "#ffffff",
        onPrimaryContainer: "#042f2e",
        secondary: "#0284c7",
        secondaryContainer: "#e0f2fe",
        onSecondary: "#ffffff",
        tertiary: "#ea580c",
        tertiaryContainer: "#ffedd5",
      },
      dark: {
        primary: "#2dd4bf",
        primaryContainer: "#0f766e",
        onPrimary: "#042f2e",
        onPrimaryContainer: "#ccfbf1",
        secondary: "#38bdf8",
        secondaryContainer: "#075985",
        onSecondary: "#082f49",
        tertiary: "#fb923c",
        tertiaryContainer: "#7c2d12",
      },
    },
  },
];

export const Appearance: React.FC = () => {
  const [activeTheme, setActiveTheme] = useState<ActiveThemeData | null>(() =>
    themeService.getCachedTheme()
  );
  const [isLoading, setIsLoading] = useState(() => !themeService.getCachedTheme());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form edit state
  const [lightPrimary, setLightPrimary] = useState("#ae3200");
  const [lightPrimaryContainer, setLightPrimaryContainer] = useState("#ff5a1f");
  const [lightSecondary, setLightSecondary] = useState("#006c45");
  const [lightTertiary, setLightTertiary] = useState("#005ac2");

  const [darkPrimary, setDarkPrimary] = useState("#ffb59e");
  const [darkPrimaryContainer, setDarkPrimaryContainer] = useState("#ff5a1f");
  const [darkSecondary, setDarkSecondary] = useState("#69dca1");
  const [darkTertiary, setDarkTertiary] = useState("#adc6ff");

  const [selectedPresetName, setSelectedPresetName] = useState<string>("Custom");

  // Sync state from theme data
  const syncStateFromTheme = useCallback((themeData?: ActiveThemeData | null) => {
    if (!themeData) return;
    setActiveTheme(themeData);
    const light = themeData.colorHexMap?.light || {};
    const dark = themeData.colorHexMap?.dark || {};

    if (light.primary) setLightPrimary(light.primary);
    if (light.primaryContainer) setLightPrimaryContainer(light.primaryContainer);
    if (light.secondary) setLightSecondary(light.secondary);
    if (light.tertiary) setLightTertiary(light.tertiary);

    if (dark.primary) setDarkPrimary(dark.primary);
    if (dark.primaryContainer) setDarkPrimaryContainer(dark.primaryContainer);
    if (dark.secondary) setDarkSecondary(dark.secondary);
    if (dark.tertiary) setDarkTertiary(dark.tertiary);

    // Identify if it matches any preset
    const match = PRESET_PALETTES.find((p) => p.colorHexMap.light.primary === light.primary);
    setSelectedPresetName(match ? match.name : "Custom");
  }, []);

  // Fetch active theme directly from database
  const refreshThemeFromDb = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await themeService.getActiveTheme();
      syncStateFromTheme(data);
      toast.success("Theme Loaded from Database", {
        description: `Active database theme "${data.name}" loaded successfully.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof ThemeServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to connect to backend theme service.";
      toast.error("Failed to Load Theme", {
        description: message,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [syncStateFromTheme]);

  useEffect(() => {
    const controller = new AbortController();
    const hasCached = !!themeService.getCachedTheme();

    themeService
      .getActiveTheme({ silent: hasCached, signal: controller.signal })
      .then((data) => {
        syncStateFromTheme(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [syncStateFromTheme]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: PalettePreset) => {
    setSelectedPresetName(preset.name);
    const light = preset.colorHexMap.light;
    const dark = preset.colorHexMap.dark;

    setLightPrimary(light.primary);
    setLightPrimaryContainer(light.primaryContainer);
    setLightSecondary(light.secondary);
    setLightTertiary(light.tertiary);

    setDarkPrimary(dark.primary);
    setDarkPrimaryContainer(dark.primaryContainer);
    setDarkSecondary(dark.secondary);
    setDarkTertiary(dark.tertiary);

    // Live preview in DOM immediately
    applyThemeToDom(preset.colorHexMap);
  };

  // Live preview when manual color picker changes
  const handleColorChange = (
    updater: (val: string) => void,
    val: string,
    _mode: "light" | "dark",
    key: string
  ) => {
    updater(val);
    setSelectedPresetName("Custom");

    // Instantly update DOM CSS variable for 0ms visual feedback
    if (typeof document !== "undefined") {
      const kebab = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").toLowerCase();
      document.documentElement.style.setProperty(`--color-${kebab}`, val);
    }
  };

  // Save changes to PostgreSQL database and implement across portal
  const handleSaveAndApply = async (e: React.FormEvent) => {
    e.preventDefault();

    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    const colorsToCheck = [
      { name: "Light Primary", val: lightPrimary },
      { name: "Light Primary Container", val: lightPrimaryContainer },
      { name: "Light Secondary", val: lightSecondary },
      { name: "Light Tertiary", val: lightTertiary },
      { name: "Dark Primary", val: darkPrimary },
      { name: "Dark Primary Container", val: darkPrimaryContainer },
      { name: "Dark Secondary", val: darkSecondary },
      { name: "Dark Tertiary", val: darkTertiary },
    ];

    for (const c of colorsToCheck) {
      if (!hexRegex.test(c.val)) {
        toast.error("Invalid Color Format", {
          description: `${c.name} must be a valid hex color code (e.g., #ae3200).`,
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      const currentLight = activeTheme?.colorHexMap?.light || {};
      const currentDark = activeTheme?.colorHexMap?.dark || {};

      const presetMatch = PRESET_PALETTES.find((p) => p.name === selectedPresetName);
      const baseLight = presetMatch ? presetMatch.colorHexMap.light : currentLight;
      const baseDark = presetMatch ? presetMatch.colorHexMap.dark : currentDark;

      const updatedHexMap: ColorHexMap = {
        light: {
          ...baseLight,
          primary: lightPrimary,
          primaryContainer: lightPrimaryContainer,
          secondary: lightSecondary,
          tertiary: lightTertiary,
        },
        dark: {
          ...baseDark,
          primary: darkPrimary,
          primaryContainer: darkPrimaryContainer,
          secondary: darkSecondary,
          tertiary: darkTertiary,
        },
      };

      const updated = await themeService.updateActiveTheme({
        color_hex_map: updatedHexMap,
        name: selectedPresetName === "Custom" ? "Custom Brand Theme" : selectedPresetName,
      });

      syncStateFromTheme(updated);

      toast.success("Theme Colors Saved & Implemented", {
        description: "Your color palette has been saved to the PostgreSQL database and applied to the console.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof ThemeServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to update theme in database.";
      toast.error("Save Failed", {
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to current database state
  const handleResetToDatabase = () => {
    if (activeTheme) {
      syncStateFromTheme(activeTheme);
      applyThemeToDom(activeTheme.colorHexMap);
      toast.info("Reset to Database Defaults", {
        description: "Reverted unsaved color modifications to active database theme.",
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary" size="sm">
                <Icons.Palette size={13} className="mr-1" /> Dynamic Theme Engine
              </Badge>
              <Badge variant="success" size="sm">
                PostgreSQL Live
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Appearance & Colors
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              Customize primary brand colors, container gradients, and semantic accent palettes directly saved to PostgreSQL.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshThemeFromDb}
            disabled={isLoading || isRefreshing}
            leftIcon={
              isRefreshing ? (
                <Spinner size="sm" color="primary" />
              ) : (
                <Icons.RotateCcw size={14} />
              )
            }
            className="shrink-0 cursor-pointer hidden sm:flex"
          >
            {isRefreshing ? "Loading..." : "Sync DB"}
          </Button>
        </div>
      </div>

      {/* Preset Palettes Grid */}
      <Card>
        <CardHeader className="p-5 border-b border-outline-variant/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Icons.Sparkles size={18} className="text-primary" /> Curated Theme Palettes
              </CardTitle>
              <CardDescription className="text-xs">
                Select a cohesive enterprise color palette to preview and apply immediately
              </CardDescription>
            </div>
            {selectedPresetName !== "Custom" && (
              <Badge variant="primary" size="sm">
                Active Preset: {selectedPresetName}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {PRESET_PALETTES.map((preset) => {
              const isSelected = selectedPresetName === preset.name;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                      : "border-outline-variant/30 bg-surface-container hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {/* Color Swatch Pill */}
                    <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface-container-high border border-outline-variant/20">
                      <div
                        className="w-4 h-4 rounded-full shadow-xs"
                        style={{ backgroundColor: preset.preview }}
                      />
                      <div
                        className="w-4 h-4 rounded-full shadow-xs"
                        style={{ backgroundColor: preset.colorHexMap.light.primaryContainer }}
                      />
                      <div
                        className="w-4 h-4 rounded-full shadow-xs"
                        style={{ backgroundColor: preset.colorHexMap.light.secondary }}
                      />
                    </div>
                    <span className="font-semibold text-sm text-on-surface truncate">
                      {preset.name}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Interactive Color Controls & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Light & Dark Color Inputs */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="p-5 border-b border-outline-variant/20">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Icons.Palette size={18} className="text-primary" /> Brand Color Customizer
              </CardTitle>
              <CardDescription className="text-xs">
                Fine-tune specific hex color codes for Light and Dark modes
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              {/* Light Mode Colors */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                  <Icons.Sun size={16} className="text-amber-500" />
                  <span className="font-semibold text-sm text-on-surface">
                    Light Theme Palette
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Light Primary */}
                  <div className="space-y-1.5">
                    <Label htmlFor="light-primary" className="text-xs">
                      Primary Brand Color
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="light-primary-picker"
                        value={lightPrimary}
                        onChange={(e) =>
                          handleColorChange(setLightPrimary, e.target.value, "light", "primary")
                        }
                        className="w-10 h-10 rounded-lg border border-outline-variant/40 cursor-pointer p-0.5 bg-surface-container shrink-0"
                      />
                      <Input
                        id="light-primary"
                        value={lightPrimary}
                        onChange={(e) =>
                          handleColorChange(setLightPrimary, e.target.value, "light", "primary")
                        }
                        placeholder="#ae3200"
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Light Primary Container */}
                  <div className="space-y-1.5">
                    <Label htmlFor="light-primary-container" className="text-xs">
                      Primary Accent / Container
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="light-primary-container-picker"
                        value={lightPrimaryContainer}
                        onChange={(e) =>
                          handleColorChange(
                            setLightPrimaryContainer,
                            e.target.value,
                            "light",
                            "primaryContainer"
                          )
                        }
                        className="w-10 h-10 rounded-lg border border-outline-variant/40 cursor-pointer p-0.5 bg-surface-container shrink-0"
                      />
                      <Input
                        id="light-primary-container"
                        value={lightPrimaryContainer}
                        onChange={(e) =>
                          handleColorChange(
                            setLightPrimaryContainer,
                            e.target.value,
                            "light",
                            "primaryContainer"
                          )
                        }
                        placeholder="#ff5a1f"
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Light Secondary */}
                  <div className="space-y-1.5">
                    <Label htmlFor="light-secondary" className="text-xs">
                      Secondary Success Accent
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="light-secondary-picker"
                        value={lightSecondary}
                        onChange={(e) =>
                          handleColorChange(
                            setLightSecondary,
                            e.target.value,
                            "light",
                            "secondary"
                          )
                        }
                        className="w-10 h-10 rounded-lg border border-outline-variant/40 cursor-pointer p-0.5 bg-surface-container shrink-0"
                      />
                      <Input
                        id="light-secondary"
                        value={lightSecondary}
                        onChange={(e) =>
                          handleColorChange(
                            setLightSecondary,
                            e.target.value,
                            "light",
                            "secondary"
                          )
                        }
                        placeholder="#006c45"
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Light Tertiary */}
                  <div className="space-y-1.5">
                    <Label htmlFor="light-tertiary" className="text-xs">
                      Tertiary Link / Highlight
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="light-tertiary-picker"
                        value={lightTertiary}
                        onChange={(e) =>
                          handleColorChange(setLightTertiary, e.target.value, "light", "tertiary")
                        }
                        className="w-10 h-10 rounded-lg border border-outline-variant/40 cursor-pointer p-0.5 bg-surface-container shrink-0"
                      />
                      <Input
                        id="light-tertiary"
                        value={lightTertiary}
                        onChange={(e) =>
                          handleColorChange(setLightTertiary, e.target.value, "light", "tertiary")
                        }
                        placeholder="#005ac2"
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dark Mode Colors */}
              <div className="space-y-4 pt-4 border-t border-outline-variant/20">
                <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                  <Icons.Moon size={16} className="text-primary" />
                  <span className="font-semibold text-sm text-on-surface">
                    Dark Theme Palette
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dark Primary */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dark-primary" className="text-xs">
                      Dark Mode Primary
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="dark-primary-picker"
                        value={darkPrimary}
                        onChange={(e) =>
                          handleColorChange(setDarkPrimary, e.target.value, "dark", "primary")
                        }
                        className="w-10 h-10 rounded-lg border border-outline-variant/40 cursor-pointer p-0.5 bg-surface-container shrink-0"
                      />
                      <Input
                        id="dark-primary"
                        value={darkPrimary}
                        onChange={(e) =>
                          handleColorChange(setDarkPrimary, e.target.value, "dark", "primary")
                        }
                        placeholder="#ffb59e"
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Dark Primary Container */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dark-primary-container" className="text-xs">
                      Dark Mode Accent / Container
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="dark-primary-container-picker"
                        value={darkPrimaryContainer}
                        onChange={(e) =>
                          handleColorChange(
                            setDarkPrimaryContainer,
                            e.target.value,
                            "dark",
                            "primaryContainer"
                          )
                        }
                        className="w-10 h-10 rounded-lg border border-outline-variant/40 cursor-pointer p-0.5 bg-surface-container shrink-0"
                      />
                      <Input
                        id="dark-primary-container"
                        value={darkPrimaryContainer}
                        onChange={(e) =>
                          handleColorChange(
                            setDarkPrimaryContainer,
                            e.target.value,
                            "dark",
                            "primaryContainer"
                          )
                        }
                        placeholder="#ff5a1f"
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Dark Secondary */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dark-secondary" className="text-xs">
                      Dark Mode Secondary
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="dark-secondary-picker"
                        value={darkSecondary}
                        onChange={(e) =>
                          handleColorChange(setDarkSecondary, e.target.value, "dark", "secondary")
                        }
                        className="w-10 h-10 rounded-lg border border-outline-variant/40 cursor-pointer p-0.5 bg-surface-container shrink-0"
                      />
                      <Input
                        id="dark-secondary"
                        value={darkSecondary}
                        onChange={(e) =>
                          handleColorChange(setDarkSecondary, e.target.value, "dark", "secondary")
                        }
                        placeholder="#69dca1"
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Dark Tertiary */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dark-tertiary" className="text-xs">
                      Dark Mode Tertiary
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="dark-tertiary-picker"
                        value={darkTertiary}
                        onChange={(e) =>
                          handleColorChange(setDarkTertiary, e.target.value, "dark", "tertiary")
                        }
                        className="w-10 h-10 rounded-lg border border-outline-variant/40 cursor-pointer p-0.5 bg-surface-container shrink-0"
                      />
                      <Input
                        id="dark-tertiary"
                        value={darkTertiary}
                        onChange={(e) =>
                          handleColorChange(setDarkTertiary, e.target.value, "dark", "tertiary")
                        }
                        placeholder="#adc6ff"
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Controls */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline-variant/20">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetToDatabase}
                  disabled={isSaving}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  Reset to DB Defaults
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleSaveAndApply}
                  disabled={isSaving}
                  leftIcon={
                    isSaving ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <Icons.Save size={16} />
                    )
                  }
                  className="cursor-pointer w-full sm:w-auto"
                >
                  {isSaving ? "Saving to Database..." : "Save & Implement"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Real-time UI Element Component Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-5 border-b border-outline-variant/20">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Icons.Eye size={18} className="text-primary" /> Live Element Preview
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time visual rendering with active CSS variables
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              {/* Button Previews */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Interactive Buttons
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm">
                    Primary Action
                  </Button>
                  <Button variant="secondary" size="sm">
                    Secondary
                  </Button>
                  <Button variant="outline" size="sm">
                    Outline
                  </Button>
                </div>
              </div>

              {/* Badge Previews */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Status Badges
                </span>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="primary" size="sm">
                    Primary Tag
                  </Badge>
                  <Badge variant="success" size="sm">
                    Active State
                  </Badge>
                  <Badge variant="outline" size="sm">
                    Outlined
                  </Badge>
                </div>
              </div>

              {/* Sample Card Box */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Card Geometry
                </span>
                <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-on-surface">Sample Entity</span>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: lightPrimary }}
                    />
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    This card dynamically inherits your active database color tokens.
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-primary font-semibold">
                    <span>Active Hex</span>
                    <span>{lightPrimary}</span>
                  </div>
                </div>
              </div>

              {/* Database Status Info */}
              <div className="p-3.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/20 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-on-surface">
                  <Icons.Check size={14} className="text-emerald-500" />
                  <span>Database Connected</span>
                </div>
                <p className="text-on-surface-variant text-[11px]">
                  Colors will be persisted to PostgreSQL <code className="text-primary">themes</code> table.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Appearance;
