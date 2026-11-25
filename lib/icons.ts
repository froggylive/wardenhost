import {
  Server, Boxes, Cpu, Gamepad2, MessageSquare, Globe, Zap, Shield, HardDrive,
  Network, Cloud, Database, Activity, Layers, Terminal, Rocket, Box, LockKeyhole,
  Gauge, CircleDot, LayoutDashboard, ShoppingBag, FileText, CreditCard, UserRound,
  LifeBuoy, Settings, Users, Tag, Receipt, ScrollText, Bell, Home, Percent,
  Wallet, Building2, Clock, FileCheck2, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Server, Boxes, Cpu, Gamepad2, MessageSquare, Globe, Zap, Shield, HardDrive,
  Network, Cloud, Database, Activity, Layers, Terminal, Rocket, Box, LockKeyhole,
  Gauge, CircleDot, LayoutDashboard, ShoppingBag, FileText, CreditCard, UserRound,
  LifeBuoy, Settings, Users, Tag, Receipt, ScrollText, Bell, Home, Percent,
  Wallet, Building2, Clock, FileCheck2,
};

export const ICON_NAMES = Object.keys(ICONS);

export function getIcon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Server;
}
