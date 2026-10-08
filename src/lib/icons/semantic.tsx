import React from "react";
import type { IconComponent } from "./types.ts";
import {
  Search as LucideSearch,
  ShoppingCart as LucideCart,
  Compass as LucideExplore,
  LayoutGrid as LucideCategories,
  Tag as LucideSell,
  Menu as LucideMenu,
  X as LucideClose,
  Sun as LucideThemeLight,
  Moon as LucideThemeDark,
  Sparkles as LucideMagic,
  ChevronRight as LucideNext,
  ChevronLeft as LucideBack,
  Home as LucideHome,
  Send as LucideSend,
  CheckCircle2 as LucideSuccess,
  ShieldCheck as LucideSecurity,
  Zap as LucidePerformance,
  Star as LucideRating,
  BadgeCheck as LucideVerified,
  AlertTriangle as LucideServerError,
  SearchX as LucideNoResults,
  Check as LucideCheck,
  Eye as LucideEye,
  EyeOff as LucideEyeOff,
  Lock as LucideLock,
  Mail as LucideMail,
  User as LucideUser,
  LogOut as LucideLogOut,
  Settings as LucideSettings,
  Building as LucideBuilding,
  KeyRound as LucideKey,
  Save as LucideSave,
  Pencil as LucidePencil,
  Globe as LucideGlobe,
  MapPin as LucideMapPin,
  DollarSign as LucideDollarSign,
  Percent as LucidePercent,
  ExternalLink as LucideExternalLink,
  Trash2 as LucideTrash,
  Users as LucideUsers,
  Store as LucideStore,
  UserCheck as LucideUserCheck,
  Coins as LucideCoins,
  Wallet as LucideWallet,
  Banknote as LucideBanknote,
} from "lucide-react";

import type { LucideProps } from "lucide-react";

function createSemanticIcon(LucideIcon: React.ComponentType<LucideProps>): IconComponent {
  const Component: IconComponent = ({
    size = 20,
    strokeWidth = 2,
    className = "",
    ...props
  }) => (
    <LucideIcon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
  return Component;
}

// Semantic UI Icons conforming to IconProps
export const Search: IconComponent = createSemanticIcon(LucideSearch);
export const Cart: IconComponent = createSemanticIcon(LucideCart);
export const Explore: IconComponent = createSemanticIcon(LucideExplore);
export const Categories: IconComponent = createSemanticIcon(LucideCategories);
export const Sell: IconComponent = createSemanticIcon(LucideSell);
export const Menu: IconComponent = createSemanticIcon(LucideMenu);
export const Close: IconComponent = createSemanticIcon(LucideClose);
export const ThemeLight: IconComponent = createSemanticIcon(LucideThemeLight);
export const ThemeDark: IconComponent = createSemanticIcon(LucideThemeDark);
export const Magic: IconComponent = createSemanticIcon(LucideMagic);
export const Next: IconComponent = createSemanticIcon(LucideNext);
export const Back: IconComponent = createSemanticIcon(LucideBack);
export const Home: IconComponent = createSemanticIcon(LucideHome);
export const Send: IconComponent = createSemanticIcon(LucideSend);
export const Success: IconComponent = createSemanticIcon(LucideSuccess);
export const Security: IconComponent = createSemanticIcon(LucideSecurity);
export const Performance: IconComponent = createSemanticIcon(LucidePerformance);
export const Rating: IconComponent = createSemanticIcon(LucideRating);
export const Verified: IconComponent = createSemanticIcon(LucideVerified);
export const ServerError: IconComponent = createSemanticIcon(LucideServerError);
export const NoResults: IconComponent = createSemanticIcon(LucideNoResults);
export const Check: IconComponent = createSemanticIcon(LucideCheck);
export const Eye: IconComponent = createSemanticIcon(LucideEye);
export const EyeOff: IconComponent = createSemanticIcon(LucideEyeOff);
export const Lock: IconComponent = createSemanticIcon(LucideLock);
export const Mail: IconComponent = createSemanticIcon(LucideMail);
export const User: IconComponent = createSemanticIcon(LucideUser);
export const LogOut: IconComponent = createSemanticIcon(LucideLogOut);
export const Logout: IconComponent = LogOut;
export const Settings: IconComponent = createSemanticIcon(LucideSettings);
export const Building: IconComponent = createSemanticIcon(LucideBuilding);
export const Key: IconComponent = createSemanticIcon(LucideKey);
export const Save: IconComponent = createSemanticIcon(LucideSave);
export const Pencil: IconComponent = createSemanticIcon(LucidePencil);
export const Edit: IconComponent = Pencil;
export const Globe: IconComponent = createSemanticIcon(LucideGlobe);
export const MapPin: IconComponent = createSemanticIcon(LucideMapPin);
export const DollarSign: IconComponent = createSemanticIcon(LucideDollarSign);
export const Percent: IconComponent = createSemanticIcon(LucidePercent);
export const ExternalLink: IconComponent = createSemanticIcon(LucideExternalLink);
export const Trash: IconComponent = createSemanticIcon(LucideTrash);
export const Delete: IconComponent = Trash;
export const Users: IconComponent = createSemanticIcon(LucideUsers);
export const Store: IconComponent = createSemanticIcon(LucideStore);
export const UserCheck: IconComponent = createSemanticIcon(LucideUserCheck);
export const Coins: IconComponent = createSemanticIcon(LucideCoins);
export const Wallet: IconComponent = createSemanticIcon(LucideWallet);
export const Banknote: IconComponent = createSemanticIcon(LucideBanknote);
export const Currency: IconComponent = Coins;

// Friendly aliases
export const Sun: IconComponent = ThemeLight;
export const Moon: IconComponent = ThemeDark;
export const ShoppingCart: IconComponent = Cart;
export const Sparkles: IconComponent = Magic;
export const ChevronRight: IconComponent = Next;
export const ChevronLeft: IconComponent = Back;
