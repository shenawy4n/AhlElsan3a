import {
  Zap, Droplets, Hammer, PaintRoller, Wrench, AirVent, Plug, Car, CarFront, Building2, Grid3x3, Frame,
  Layers, Satellite, Scissors, Sparkles, Camera, GraduationCap, Truck, Home, MoreHorizontal, Brush,
  Flame, Fan, Refrigerator, WashingMachine, Tv, Smartphone, Laptop, Bike, Sofa, DoorOpen, KeyRound,
  Bug, Trees, Shirt, Baby, Stethoscope, Pill, Utensils, Cake, ShoppingBasket, Package, Ruler,
  Shovel, Drill, Lightbulb, ShowerHead, Paintbrush, Tractor, Dog, Music, BookOpen, Store,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Zap, Droplets, Hammer, PaintRoller, Wrench, AirVent, Plug, Car, CarFront, Building2, Grid3x3, Frame,
  Layers, Trowel: Brush, Satellite, Scissors, Sparkles, Camera, GraduationCap, Truck, Home,
  Flame, Fan, Refrigerator, WashingMachine, Tv, Smartphone, Laptop, Bike, Sofa, DoorOpen, KeyRound,
  Bug, Trees, Shirt, Baby, Stethoscope, Pill, Utensils, Cake, ShoppingBasket, Package, Ruler,
  Shovel, Drill, Lightbulb, ShowerHead, Paintbrush, Tractor, Dog, Music, BookOpen, Store, MoreHorizontal,
};

export const ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || MoreHorizontal;
  return <Icon className={className} />;
}
