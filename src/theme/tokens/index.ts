import { COLOR_TOKENS, COLOR_HEX_MAP } from "./colors";
import { TYPOGRAPHY_TOKENS } from "./typography";
import { LAYOUT_TOKENS } from "./layout";

export const TOKENS = {
  colors: COLOR_TOKENS,
  palette: COLOR_HEX_MAP,
  typography: TYPOGRAPHY_TOKENS,
  layout: LAYOUT_TOKENS,
} as const;

export type ThemeTokens = typeof TOKENS;
export type ColorScheme = keyof typeof COLOR_HEX_MAP;

export { COLOR_TOKENS, COLOR_HEX_MAP, TYPOGRAPHY_TOKENS, LAYOUT_TOKENS };
