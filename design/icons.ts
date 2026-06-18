// design/icons.ts — mappa icone centralizzata (lucide-react-native). NO mix di librerie, NO emoji.
// Uso: import { Icons } from '@/design/icons'; <Icons.turni size={28} color={colors.blue} />
import {
  Home, Calendar, Users, BarChart3, FileText, Bell, User, Settings,
  Clock, Heart, AlertTriangle, Grid3x3, CalendarRange, FlaskConical,
  Building2, Sun, Mail, Star, Download, Phone, Shield, Cloud,
  Smartphone, Palette, CheckCircle2, XCircle, ChevronRight, ChevronLeft,
  Plus, Minus, Trash2, Pencil, X, Search, ArrowUp, ArrowRight,
} from 'lucide-react-native';

// Mappa semantica funzione → icona (un'unica fonte).
export const Icons = {
  home: Home,
  pianificazione: Calendar,
  personale: Users,
  controllo: BarChart3,
  report: FileText,
  notifiche: Bell,
  profilo: User,
  impostazioni: Settings,
  bancaOre: Clock,
  desiderata: Heart,
  criticita: AlertTriangle,
  matrici: Grid3x3,
  matriciStagionali: CalendarRange,
  simulatore: FlaskConical,
  reparti: Building2,
  ferie: Sun,
  richieste: Mail,
  copertura: Star,
  importPersonale: Download,
  reperibilita: Phone,
  sicurezza: Shield,
  backup: Cloud,
  dispositivi: Smartphone,
  personalizzazione: Palette,
  // azioni comuni
  approva: CheckCircle2,
  rifiuta: XCircle,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  add: Plus,
  minus: Minus,
  delete: Trash2,
  edit: Pencil,
  close: X,
  search: Search,
  arrowUp: ArrowUp,
  arrowRight: ArrowRight,
} as const;
export type IconName = keyof typeof Icons;
