import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// Map of icon names to their components
const iconMap: Record<string, LucideIcon> = {
  // Income icons
  Briefcase: LucideIcons.Briefcase,
  Building2: LucideIcons.Building2,
  Laptop: LucideIcons.Laptop,
  TrendingUp: LucideIcons.TrendingUp,
  Home: LucideIcons.Home,
  Plus: LucideIcons.Plus,
  
  // Expense icons
  PiggyBank: LucideIcons.PiggyBank,
  Shield: LucideIcons.Shield,
  Heart: LucideIcons.Heart,
  Wallet: LucideIcons.Wallet,
  Award: LucideIcons.Award,
  Monitor: LucideIcons.Monitor,
  Minus: LucideIcons.Minus,
  Building: LucideIcons.Building,
  Car: LucideIcons.Car,
  Utensils: LucideIcons.Utensils,
  ShoppingBag: LucideIcons.ShoppingBag,
  Zap: LucideIcons.Zap,
  Wifi: LucideIcons.Wifi,
  GraduationCap: LucideIcons.GraduationCap,
  Plane: LucideIcons.Plane,
  Gift: LucideIcons.Gift,
  Stethoscope: LucideIcons.Stethoscope,
  Dumbbell: LucideIcons.Dumbbell,
  Gamepad2: LucideIcons.Gamepad2,
  Music: LucideIcons.Music,
  Film: LucideIcons.Film,
  Book: LucideIcons.Book,
  Coffee: LucideIcons.Coffee,
  Shirt: LucideIcons.Shirt,
  Wrench: LucideIcons.Wrench,
  Baby: LucideIcons.Baby,
  PawPrint: LucideIcons.PawPrint,
  Landmark: LucideIcons.Landmark,
  CreditCard: LucideIcons.CreditCard,
  Banknote: LucideIcons.Banknote,
  Receipt: LucideIcons.Receipt,
  Calculator: LucideIcons.Calculator,
  DollarSign: LucideIcons.DollarSign,
  CircleDollarSign: LucideIcons.CircleDollarSign,
  HandCoins: LucideIcons.HandCoins,
  HelpCircle: LucideIcons.HelpCircle,
};

interface CategoryIconProps {
  name: string | null | undefined;
  className?: string;
}

export function CategoryIcon({ name, className = "w-4 h-4" }: CategoryIconProps) {
  if (!name) {
    return <LucideIcons.HelpCircle className={className} />;
  }

  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    // Fallback for unknown icons
    return <LucideIcons.HelpCircle className={className} />;
  }

  return <IconComponent className={className} />;
}

export function getCategoryIconComponent(name: string | null | undefined): LucideIcon {
  if (!name) return LucideIcons.HelpCircle;
  return iconMap[name] || LucideIcons.HelpCircle;
}
