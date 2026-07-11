'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useCartStore, useWishlistStore, useCouponStore, useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { getSocket, disconnectSocket, emitProductChange, emitCategoryChange } from '@/lib/realtime'
import { formatPrice, countries, getCountryByCode } from '@/lib/currency'
import { isValidPhone } from '@/lib/phone'
import { PhoneInput } from '@/components/phone-input'
import { trackEvent, PAGE_LABELS } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  ShoppingCart, Sun, Moon, Menu, Home, Store, ShieldCheck, Truck, CreditCard, Star,
  Plus, Minus, Trash2, ArrowLeft, Search, ChevronDown, Package, DollarSign,
  Clock, TrendingUp, Users, Mail, Instagram, Youtube, MapPin, Phone,
  X, ShoppingBag, CheckCircle2, ArrowRight, Sparkles, Heart, Eye, Filter,
  BarChart3, Boxes, ClipboardList, RefreshCw, Globe, ChevronRight, ChevronLeft, LogIn,
  LogOut, UserCircle, UserPlus, Lock, AlertCircle, Check,
  EyeOff, Save, Calendar, Pencil, ToggleLeft, ToggleRight, ImagePlus, Upload, ImageIcon,
  Info, MessageSquare, Send, Award, Target, Leaf, Handshake, Building2,
  Wallet, Banknote, Smartphone, Receipt, CircleDollarSign, RotateCcw, Tag, FolderOpen, UsersRound, Shield
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { useToast } from '@/hooks/use-toast'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  status: string
}

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  image: string | null
  images: string[]
  categoryId: string
  featured: boolean
  discount: number
  stock: number
  status: string
  createdAt: string
  category: Category
}

interface OrderItem {
  id: string
  productId: string
  name: string
  quantity: number
  price: number
}

interface Order {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  total: number
  couponCode?: string | null
  discountAmount?: number
  status: string
  currency: string
  country: string
  paymentMethod: string
  paymentStatus: string
  transactionId: string | null
  cardLast4: string | null
  paidAt: string | null
  createdAt: string
  items: OrderItem[]
}

interface EngagementStats {
  totalCustomers: number
  newCustomers30d: number
  pageViews30d: number
  uniqueVisitors30d: number
  returningVisitors: number
  signIns30d: number
  signUps30d: number
  addToCart30d: number
  checkouts30d: number
  orders30d: number
  conversionRate: number
  dailyEngagement: { day: string; pageViews: number; uniqueVisitors: number }[]
  topPages: { page: string; views: number }[]
  funnel: { step: string; count: number }[]
}

interface AdminStats {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  ordersByStatus: { status: string; _count: { status: number } }[]
  categories: { id: string; name: string; slug: string; _count: { products: number } }[]
  recentOrders: Order[]
  monthlyRevenue: { month: string; revenue: number }[]
  paymentStats: { status: string; count: number; total: number }[]
  paymentMethodStats: { method: string; count: number; total: number }[]
  paidRevenue: number
  pendingPayments: number
  engagement?: EngagementStats
}

// ─── Permission System ─────────────────────────────────────────────────────

interface PermissionSet {
  products?: { view?: boolean; add?: boolean; edit?: boolean; delete?: boolean }
  categories?: { view?: boolean; add?: boolean; edit?: boolean; delete?: boolean }
  orders?: { view?: boolean; edit?: boolean; delete?: boolean }
  staff?: { view?: boolean; add?: boolean; edit?: boolean; delete?: boolean }
}

interface StaffMember {
  id: string
  name: string
  email: string
  image: string | null
  role: string
  adminRole: string
  permissions: string
  createdAt: string
}

function parsePermissions(permStr?: string): PermissionSet {
  try {
    return permStr ? JSON.parse(permStr) : {}
  } catch {
    return {}
  }
}

function hasPermission(permStr: string | undefined, section: string, action: string): boolean {
  const perms = parsePermissions(permStr)
  return (perms as Record<string, Record<string, boolean>>)?.[section]?.[action] === true
}

function isSuperAdmin(adminRole?: string): boolean {
  return adminRole === 'super_admin'
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
}

const slideUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 40 },
  transition: { duration: 0.4, ease: 'easeOut' },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
}

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CONTACT_EMAIL = 'info@alifaain.com'
const CONTACT_PHONE = '+966 53 245 1422'

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.5 2 6 4.5 6 8c0 1.5.5 2.8 1.3 3.9-.9.3-1.8.7-2.5 1.2-.5.4-.3 1.1.3 1.2 1 .2 2.5.4 3.9.5-.2.9-.3 1.8-.3 2.4 0 .6.4 1 1 1h5.6c.6 0 1-.4 1-1 0-.6-.1-1.5-.3-2.4 1.4-.1 2.9-.3 3.9-.5.6-.1.8-.8.3-1.2-.7-.5-1.6-.9-2.5-1.2.8-1.1 1.3-2.4 1.3-3.9 0-3.5-2.5-6-6-6z" />
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

const SOCIAL_LINKS = [
  {
    label: 'YouTube',
    href: 'https://youtube.com/@alifaain-q8z?si=cUMSneAWuQZ_eLKC',
    icon: Youtube,
  },
  {
    label: 'Snapchat',
    href: 'https://www.snapchat.com/add/alifaain007?share_id=A5ZUHTKCBXg&locale=en-GB',
    icon: SnapchatIcon,
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@alif.aain?_r=1&_t=ZS-96t3JMcN4OC',
    icon: TikTokIcon,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/alif.aain?utm_source=qr&igsh=MWUzcHZvNHR4Z2ljZQ==',
    icon: Instagram,
  },
] as const

function SocialLinkButton({
  href,
  label,
  icon: Icon,
  variant = 'ghost',
  size = 'icon',
  className = '',
  showLabel = false,
}: {
  href: string
  label: string
  icon: React.ElementType<{ className?: string }>
  variant?: 'ghost' | 'outline'
  size?: 'icon' | 'lg'
  className?: string
  showLabel?: boolean
}) {
  return (
    <Button variant={variant} size={size} className={className} asChild>
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
        <Icon className={size === 'lg' ? 'size-5' : 'size-4'} />
        {showLabel && <span className="hidden sm:inline">{label}</span>}
      </a>
    </Button>
  )
}

// ─── Royal Theme Palette ─────────────────────────────────────────────────────

const ROYAL_GRADIENT_DEFAULT = 'from-emerald-800 to-green-900'

const categoryGradients: Record<string, string> = {
  morocco: 'from-emerald-950 via-green-900 to-teal-950',
  korea: 'from-green-950 via-emerald-900 to-green-950',
  supplements: 'from-teal-950 via-emerald-950 to-green-950',
  clothing: 'from-emerald-800 via-green-700 to-emerald-950',
  fragrances: 'from-green-950 via-emerald-900 to-teal-950',
  books: 'from-teal-950 via-green-950 to-emerald-950',
  literature: 'from-teal-950 via-green-950 to-emerald-950',
}

const royalOrderStatusColors: Record<string, string> = {
  pending: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  processing: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  confirmed: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  shipped: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
  delivered: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  cancelled: 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive',
}

const royalPaymentStatusColors: Record<string, string> = {
  pending: 'bg-gold/15 text-gold dark:bg-gold/10 dark:text-gold',
  paid: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  failed: 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive',
  refunded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

const royalCategoryStatusColors: Record<string, string> = {
  active: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  coming_soon: 'bg-gold/15 text-gold dark:bg-gold/10 dark:text-gold',
  inactive: 'bg-muted text-muted-foreground',
}

const categoryIcons: Record<string, string> = {
  morocco: '🇲🇦',
  korea: '🇰🇷',
  supplements: '💊',
  clothing: '👗',
  fragrances: '🌸',
}

function getProductInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function getGradientForCategory(slug: string): string {
  return categoryGradients[slug] || ROYAL_GRADIENT_DEFAULT
}

function getProductWishlistPrice(product: Product): number {
  return product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price
}

function WishlistButton({
  product,
  variant = 'overlay',
  className = '',
}: {
  product: Product
  variant?: 'overlay' | 'inline'
  className?: string
}) {
  const { toggleItem, isInWishlist } = useWishlistStore()
  const { toast } = useToast()
  const saved = isInWishlist(product.id)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const added = toggleItem({
      productId: product.id,
      name: product.name,
      price: getProductWishlistPrice(product),
      image: product.image || undefined,
    })
    toast({
      title: added ? 'Added to wishlist' : 'Removed from wishlist',
      description: added
        ? `${product.name} saved to your favorites.`
        : `${product.name} removed from your wishlist.`,
    })
  }

  if (variant === 'inline') {
    return (
      <Button
        variant={saved ? 'default' : 'outline'}
        size="lg"
        className={`gap-2 ${saved ? 'bg-primary hover:bg-primary/90' : ''} ${className}`}
        onClick={handleToggle}
      >
        <Heart className={`size-5 ${saved ? 'fill-current' : ''}`} />
        {saved ? 'Saved' : 'Add to Wishlist'}
      </Button>
    )
  }

  return (
    <Button
      size="icon"
      variant="secondary"
      className={`size-8 rounded-full ${saved ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''} ${className}`}
      onClick={handleToggle}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart className={`size-3.5 ${saved ? 'fill-current' : ''}`} />
    </Button>
  )
}

function CouponInput({ subtotal, countryCode }: { subtotal: number; countryCode: string }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const { applied, setApplied, clearApplied } = useCouponStore()
  const { toast } = useToast()

  const handleApply = async () => {
    const trimmed = code.trim()
    if (!trimmed) return

    setLoading(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, subtotal }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Invalid coupon', description: data.error || 'Could not apply coupon', variant: 'destructive' })
        return
      }

      setApplied(data.coupon)
      toast({
        title: 'Coupon applied!',
        description: data.coupon.description || `You save ${formatPrice(data.coupon.discountAmount, countryCode)}`,
      })
    } catch {
      toast({ title: 'Error', description: 'Failed to validate coupon', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (applied) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Tag className="size-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">{applied.code}</p>
            <p className="text-xs text-muted-foreground truncate">
              {applied.description || `${applied.discountType === 'percent' ? `${applied.discountValue}%` : 'Fixed'} discount`}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => {
            clearApplied()
            setCode('')
            toast({ title: 'Coupon removed' })
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Coupon code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="uppercase"
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
        />
        <Button variant="outline" onClick={handleApply} disabled={loading || !code.trim()} className="shrink-0">
          {loading ? <RefreshCw className="size-4 animate-spin" /> : 'Apply'}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Try <span className="font-mono text-primary">WELCOME10</span> for 10% off</p>
    </div>
  )
}

// ─── Header Component ────────────────────────────────────────────────────────

function Header() {
  const { currentView, setView, selectedCountry, setSelectedCountry } = useAppStore()
  const { items } = useCartStore()
  const wishlistItems = useWishlistStore(state => state.items)
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const totalWishlistItems = wishlistItems.length
  const { theme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, signOut } = useAuthStore()

  // Detect client-side mounting without using setState in an effect
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const countryInfo = getCountryByCode(selectedCountry)

  const navItems = [
    { label: 'Home', view: 'home' as const, icon: Home },
    { label: 'Shop', view: 'products' as const, icon: Store },
    { label: 'About', view: 'about' as const, icon: Info },
    { label: 'Contact', view: 'contact' as const, icon: MessageSquare },
    { label: 'Wishlist', view: 'wishlist' as const, icon: Heart, badge: totalWishlistItems },
    { label: 'Cart', view: 'cart' as const, icon: ShoppingCart, badge: totalItems },
    ...(user?.role === 'admin' ? [{ label: 'Admin', view: 'admin' as const, icon: BarChart3 }] : []),
  ]

  const handleNav = (view: 'home' | 'products' | 'cart' | 'wishlist' | 'admin' | 'about' | 'contact') => {
    setView({ view })
    setMobileOpen(false)
  }

  const handleSignOut = async () => {
    await signOut()
    setUserMenuOpen(false)
    setView({ view: 'home' })
  }

  return (
    <header className="sticky top-0 z-50 relative royal-hero-bg">
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between text-white">
        {/* Logo */}
        <button onClick={() => handleNav('home')} className="flex items-center gap-2 group cursor-pointer">
          <img src="/alifaain-logo.jpg" alt="Alifaain" className="h-9 w-9 rounded-full object-cover ring-2 ring-gold/30 group-hover:ring-gold/60 transition-all cursor-pointer" />
          <span className="font-serif text-xl font-bold gold-text hidden sm:inline">Alif Aain</span>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => {
            const isActive = currentView.view === item.view || (item.view === 'admin' && currentView.view.startsWith('admin'))
            return (
              <Button
                key={item.view}
                variant="ghost"
                size="sm"
                onClick={() => handleNav(item.view)}
                className={`relative ${
                  isActive
                    ? 'bg-gold text-green-950 hover:bg-gold/90 hover:text-green-950'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <motion.span
                    key={item.badge}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-gold text-green-950 text-[10px] font-bold rounded-full size-5 flex items-center justify-center"
                  >
                    {item.badge}
                  </motion.span>
                )}
              </Button>
            )
          })}
        </nav>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2">
          {/* Country Selector */}
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-auto gap-1 border border-white/15 bg-white/5 text-white h-8 text-xs px-2 hover:bg-white/10 cursor-pointer">
              <span>{countryInfo.flag}</span>
              <span className="hidden sm:inline">{countryInfo.currency}</span>
            </SelectTrigger>
            <SelectContent>
              {countries.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="flex items-center gap-2">
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                    <span className="text-muted-foreground">({c.currency})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          )}

          {/* Auth Button / User Menu */}
          {mounted && (
            <>
              {user ? (
                <div className="relative z-50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 h-8 text-white/80 hover:bg-white/10 hover:text-white"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <div className="size-7 rounded-full bg-white/10 ring-1 ring-white/15 flex items-center justify-center overflow-hidden">
                      {user.image ? (
                        <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-gold">{user.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="hidden sm:inline text-xs max-w-[80px] truncate">{user.name}</span>
                  </Button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-64 rounded-xl shadow-2xl z-[100] overflow-hidden border border-white/10 text-white"
                        >
                          <div className="absolute inset-0 royal-hero-bg" />
                          <div className="absolute inset-0 bg-black/25 pointer-events-none" />
                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

                          <div className="relative p-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-full bg-white/10 ring-2 ring-gold/30 flex items-center justify-center overflow-hidden">
                                {user.image ? (
                                  <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-sm font-bold text-gold">{user.name.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{user.name}</p>
                                <p className="text-xs text-white/60 truncate">{user.email}</p>
                                {user.role === 'admin' && (
                                  <Badge className="text-[10px] mt-1 bg-gold/15 text-gold border border-gold/25 hover:bg-gold/20">
                                    <ShieldCheck className="size-3 mr-1" /> Admin
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="relative p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start gap-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                              onClick={() => { setView({ view: 'profile' }); setUserMenuOpen(false) }}
                            >
                              <UserCircle className="size-4" /> My Profile
                            </Button>
                            {user.role === 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start gap-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                                onClick={() => { setView({ view: 'admin' }); setUserMenuOpen(false) }}
                              >
                                <BarChart3 className="size-4" /> Admin Dashboard
                              </Button>
                            )}
                            <Separator className="my-1 bg-white/10" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start gap-2 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10"
                              onClick={handleSignOut}
                            >
                              <LogOut className="size-4" /> Sign Out
                            </Button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="gap-1.5 h-8 bg-gold text-green-950 hover:bg-gold/90 font-semibold"
                  onClick={() => setView({ view: 'signin' })}
                >
                  <LogIn className="size-3.5" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              )}
            </>
          )}

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden size-8 text-white/80 hover:bg-white/10 hover:text-white">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="font-serif text-lg gold-text mb-4">Navigation</SheetTitle>
              <nav className="flex flex-col gap-2 mt-4">
                {navItems.map(item => (
                  <Button
                    key={item.view}
                    variant={currentView.view === item.view ? 'default' : 'ghost'}
                    className="justify-start gap-3"
                    onClick={() => handleNav(item.view)}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                    {item.badge != null && item.badge > 0 && (
                      <Badge variant="destructive" className="ml-auto">{item.badge}</Badge>
                    )}
                  </Button>
                ))}
                <Separator className="my-2" />
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {user.image ? (
                          <img src={user.image} alt={user.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="text-xs font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <Button variant="ghost" className="justify-start gap-3" onClick={() => { setView({ view: 'profile' }); setMobileOpen(false) }}>
                      <UserCircle className="size-4" /> My Profile
                    </Button>
                    {user.role === 'admin' && (
                      <Button variant="ghost" className="justify-start gap-3" onClick={() => { setView({ view: 'admin' }); setMobileOpen(false) }}>
                        <BarChart3 className="size-4" /> Admin Dashboard
                      </Button>
                    )}
                    <Button variant="ghost" className="justify-start gap-3 text-destructive hover:text-destructive" onClick={handleSignOut}>
                      <LogOut className="size-4" /> Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="default" className="justify-start gap-3" onClick={() => { setView({ view: 'signin' }); setMobileOpen(false) }}>
                      <LogIn className="size-4" /> Sign In
                    </Button>
                    <Button variant="outline" className="justify-start gap-3" onClick={() => { setView({ view: 'signup' }); setMobileOpen(false) }}>
                      <UserPlus className="size-4" /> Create Account
                    </Button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

// ─── Footer Component ────────────────────────────────────────────────────────

function Footer() {
  const { setView } = useAppStore()
  const currentYear = new Date().getFullYear()

  const quickLinks = [
    { label: 'Home', view: 'home' as const },
    { label: 'Shop All', view: 'products' as const },
    { label: 'About Us', view: 'about' as const },
    { label: 'Contact', view: 'contact' as const },
    { label: 'Wishlist', view: 'wishlist' as const },
    { label: 'Cart', view: 'cart' as const },
  ]

  const categories = [
    { label: 'Morocco', slug: 'morocco' },
    { label: 'Korea', slug: 'korea' },
    { label: 'Supplements', slug: 'supplements' },
    { label: 'Clothing', slug: 'clothing' },
    { label: 'Fragrances', slug: 'fragrances' },
  ]

  return (
    <footer className="mt-auto relative overflow-hidden">
      <div className="absolute inset-0 royal-hero-bg" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Brand strip */}
        <div className="py-12 lg:py-14 border-b border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-xl">
              <button
                onClick={() => setView({ view: 'home' })}
                className="flex items-center gap-3 group cursor-pointer mb-5"
              >
                <img
                  src="/alifaain-logo.jpg"
                  alt="Alifaain"
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-gold/30 group-hover:ring-gold/60 transition-all cursor-pointer"
                />
                <div className="text-left">
                  <span className="font-serif text-2xl font-bold gold-text block">Alif Aain</span>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">Flagship of Standards</span>
                </div>
              </button>
              <p className="text-sm text-white/70 leading-relaxed">
                Curated beauty, wellness, knowledge, and style from around the globe — where heritage meets refinement.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 lg:shrink-0">
              <Button
                size="lg"
                className="bg-gold text-green-950 hover:bg-gold/90 font-semibold gap-2"
                onClick={() => setView({ view: 'products' })}
              >
                Explore Collection <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white shadow-none"
                onClick={() => setView({ view: 'contact' })}
              >
                Get in Touch
              </Button>
            </div>
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 py-12 lg:py-14">
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold mb-5">Navigate</h4>
            <ul className="space-y-3">
              {quickLinks.map(link => (
                <li key={link.view}>
                  <button
                    onClick={() => setView({ view: link.view })}
                    className="text-sm text-white/70 hover:text-white transition-colors inline-flex items-center gap-1.5 group cursor-pointer"
                  >
                    <ChevronRight className="size-3.5 text-gold/60 group-hover:translate-x-0.5 transition-transform" />
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold mb-5">Categories</h4>
            <ul className="space-y-3">
              {categories.map(cat => (
                <li key={cat.slug}>
                  <button
                    onClick={() => setView({ view: 'products', params: { category: cat.slug } })}
                    className="text-sm text-white/70 hover:text-white transition-colors inline-flex items-center gap-1.5 group cursor-pointer"
                  >
                    <ChevronRight className="size-3.5 text-gold/60 group-hover:translate-x-0.5 transition-transform" />
                    {cat.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold mb-5">Contact</h4>
            <ul className="space-y-4">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-start gap-3 text-sm text-white/70 hover:text-white transition-colors group"
                >
                  <span className="size-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-gold/30 transition-colors">
                    <Mail className="size-4 text-gold" />
                  </span>
                  <span className="pt-1.5 break-all">{CONTACT_EMAIL}</span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
                  className="flex items-start gap-3 text-sm text-white/70 hover:text-white transition-colors group"
                >
                  <span className="size-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-gold/30 transition-colors">
                    <Phone className="size-4 text-gold" />
                  </span>
                  <span className="pt-1.5">{CONTACT_PHONE}</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/70">
                <span className="size-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <MapPin className="size-4 text-gold" />
                </span>
                <span className="pt-1.5">Riyadh, Saudi Arabia</span>
              </li>
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold mb-5">Follow Us</h4>
            <p className="text-sm text-white/60 mb-4 leading-relaxed">
              Join us for new arrivals, beauty insights, and exclusive offers.
            </p>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_LINKS.map(social => (
                <SocialLinkButton
                  key={social.label}
                  href={social.href}
                  label={social.label}
                  icon={social.icon}
                  variant="outline"
                  className="size-10 bg-white/5 border-white/15 text-white/80 hover:bg-white/10 hover:text-white hover:border-gold/30 shadow-none"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-white/50">
            © {currentYear} Alif Aain. All rights reserved.
          </p>
          <p className="text-xs text-white/40 italic font-serif">
            Curated with Purpose. Inspired by the World. Defined by Excellence.
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── Promo Banner Slider ────────────────────────────────────────────────────

const promoBanners = [
  {
    id: 1,
    title: 'Moroccan Beauty Week',
    subtitle: 'Up to 30% OFF',
    description: 'Discover authentic Moroccan skincare with exclusive discounts on Argan Oil, Nila Powder & more',
    gradient: 'from-emerald-950 via-green-900 to-teal-950',
    emoji: '🇲🇦',
    cta: 'Shop Morocco',
    category: 'morocco',
    image: '/images/categories/morocco.png',
  },
  {
    id: 2,
    title: 'K-Beauty Festival',
    subtitle: 'Save up to 25%',
    description: 'Premium Korean skincare essentials — Centella, Hyalu-Cica & Retinol at unbeatable prices',
    gradient: 'from-green-950 via-emerald-900 to-green-950',
    emoji: '🇰🇷',
    cta: 'Shop Korea',
    category: 'korea',
    image: '/images/categories/korea.png',
  },
  {
    id: 3,
    title: 'Wellness Sale',
    subtitle: '20% OFF Supplements',
    description: 'Boost your inner beauty with our premium Shilajit & wellness packs',
    gradient: 'from-teal-950 via-emerald-950 to-green-950',
    emoji: '💊',
    cta: 'Shop Supplements',
    category: 'supplements',
    image: '/images/categories/supplements.png',
  },
  {
    id: 4,
    title: 'Free Shipping',
    subtitle: 'Orders over 200 SAR',
    description: 'Enjoy free delivery across Saudi Arabia on all orders above 200 SAR',
    gradient: 'from-emerald-800 via-green-700 to-teal-900',
    emoji: '🚚',
    cta: 'Start Shopping',
    category: '',
    image: '/images/hero/banner.png',
  },
]

function PromoBannerSlider() {
  const [current, setCurrent] = useState(0)
  const { setView, setSelectedCategory } = useAppStore()

  // Auto-advance slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % promoBanners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const handleCta = (category: string) => {
    if (category) {
      setSelectedCategory(category)
    }
    setView({ view: 'products' })
  }

  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl min-h-[280px] sm:min-h-[340px] lg:min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              {/* Background Image */}
              <img
                src={promoBanners[current].image}
                alt={promoBanners[current].title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Gradient Overlay - royal green tint for text readability */}
              <div className={`absolute inset-0 bg-gradient-to-r ${promoBanners[current].gradient} opacity-45`} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />

              {/* Content */}
              <div className="relative z-10 h-full flex items-center p-8 sm:p-12 lg:p-16">
                <div className="max-w-xl">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Badge className="bg-white/20 text-white border-0 text-sm mb-4 backdrop-blur-sm">
                      {promoBanners[current].emoji} {promoBanners[current].subtitle}
                    </Badge>
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-white"
                  >
                    {promoBanners[current].title}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/80 text-base sm:text-lg mb-6 max-w-md"
                  >
                    {promoBanners[current].description}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button
                      size="lg"
                      className="bg-white text-gray-900 hover:bg-white/90 font-semibold gap-2"
                      onClick={() => handleCta(promoBanners[current].category)}
                    >
                      {promoBanners[current].cta} <ArrowRight className="size-4" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Slider Controls - Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
            {promoBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`transition-all duration-300 rounded-full ${
                  idx === current
                    ? 'w-8 h-2 bg-white'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/70'
                }`}
              />
            ))}
          </div>

          {/* Arrow Controls */}
          <button
            onClick={() => setCurrent(prev => (prev - 1 + promoBanners.length) % promoBanners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors z-20"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={() => setCurrent(prev => (prev + 1) % promoBanners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors z-20"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── Home View ───────────────────────────────────────────────────────────────

function HomeView({ products, categories: apiCategories }: { products: Product[]; categories: Category[] }) {
  const { setView, setSelectedCategory } = useAppStore()
  const { addItem } = useCartStore()
  const { selectedCountry } = useAppStore()
  const { toast } = useToast()

  const featuredProducts = useMemo(() => products.filter(p => p.featured && p.status === 'active').slice(0, 8), [products])

  const discountedProducts = useMemo(() => products.filter(p => p.discount > 0 && p.status === 'active').sort((a, b) => b.discount - a.discount).slice(0, 8), [products])

  const categories = useMemo(() => {
    const catMap = new Map<string, number>()
    products.forEach(p => { catMap.set(p.category.name, (catMap.get(p.category.name) || 0) + 1) })

    return apiCategories
      .filter(c => c.status === 'active' || c.status === 'coming_soon')
      .map(c => ({
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        count: catMap.get(c.name) || 0,
        comingSoon: c.status === 'coming_soon',
        image: c.image,
      }))
  }, [products, apiCategories])

  const handleCategoryClick = (slug: string, comingSoon: boolean) => {
    if (comingSoon) return
    setSelectedCategory(slug)
    setView({ view: 'products' })
  }

  const handleAddToCart = (product: Product) => {
    addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1, image: product.image || undefined })
    toast({ title: 'Added to cart', description: `${product.name} has been added to your cart.` })
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36 royal-hero-bg text-white -mt-px">
        <div className="absolute inset-0">
          <img src="/images/hero/banner.png" alt="Alifaain Beauty" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/60 via-green-950/50 to-teal-950/55" />
        </div>
        <div className="absolute top-10 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-green-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-gold/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-6 px-4 py-1.5 text-sm font-medium bg-gold/15 text-gold border border-gold/25 hover:bg-gold/20">
              <Sparkles className="size-3.5 mr-1.5" /> Premium Beauty & Skincare
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight"
          >
            Discover Beauty,{' '}
            <span className="gold-text">Redefined</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/75 text-lg sm:text-xl max-w-2xl mx-auto mb-8"
          >
            Authentic Moroccan traditions meet innovative Korean skincare. Experience the best of both worlds.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" className="text-base px-8 bg-gold text-green-950 hover:bg-gold/90 font-semibold border-0" onClick={() => setView({ view: 'products' })}>
              Shop Now <ArrowRight className="size-4 ml-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white shadow-none dark:bg-transparent dark:border-white/40 dark:hover:bg-white/10"
              onClick={() => {
                document.getElementById('categories-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Explore Categories
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Promotional Banner Slider */}
      <PromoBannerSlider />

      {/* Categories Section */}
      <section id="categories-section" className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeIn} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">Shop by Category</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Explore our curated collections from around the world</p>
          </motion.div>

          <motion.div variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {categories.map(cat => (
              <motion.div key={cat.slug} variants={staggerItem}>
                <button
                  onClick={() => handleCategoryClick(cat.slug, cat.comingSoon)}
                  className={`w-full text-left gradient-border rounded-xl overflow-hidden transition-all duration-300 ${
                    cat.comingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.03] hover:shadow-lg cursor-pointer'
                  }`}
                  disabled={cat.comingSoon}
                >
                  <div className={`relative bg-gradient-to-br ${getGradientForCategory(cat.slug)} p-6 sm:p-8 text-white overflow-hidden`}>
                    <img src={`/images/categories/${cat.slug}.png`} alt={cat.name} className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay" />
                    <div className="absolute top-2 right-2 text-3xl opacity-30">{categoryIcons[cat.slug]}</div>
                    <span className="text-2xl mb-2 block">{categoryIcons[cat.slug]}</span>
                    <h3 className="font-serif font-bold text-lg mb-1">{cat.name}</h3>
                    <p className="text-white/80 text-xs mb-2 line-clamp-2">{cat.description}</p>
                    {cat.comingSoon ? (
                      <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px]">Coming Soon</Badge>
                    ) : (
                      <span className="text-xs text-white/70">{cat.count} products</span>
                    )}
                  </div>
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Products Section */}
      {featuredProducts.length > 0 && (
        <section className="py-16 sm:py-20 bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div {...fadeIn} viewport={{ once: true }} className="text-center mb-10">
              <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
                <Star className="size-3.5 mr-1.5" /> Curated Selection
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-3">Featured Products</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">Hand-picked favorites just for you — our most loved products</p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {featuredProducts.map(product => (
                <motion.div key={product.id} variants={staggerItem}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-10 text-center">
              <Button variant="outline" size="lg" onClick={() => setView({ view: 'products' })} className="gap-2">
                View All Products <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Discounted Products Section */}
      {discountedProducts.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div {...fadeIn} viewport={{ once: true }} className="text-center mb-10">
              <Badge className="mb-4 px-4 py-1.5 text-sm font-medium bg-primary text-gold border-0 hover:bg-primary/90">
                <Sparkles className="size-3.5 mr-1.5" /> Hot Deals
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-3">Special Offers</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">Don't miss out — limited time discounts on premium beauty products</p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {discountedProducts.map(product => (
                <motion.div key={product.id} variants={staggerItem}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-10 text-center">
              <Button variant="outline" size="lg" onClick={() => setView({ view: 'products' })} className="gap-2">
                View All Deals <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeIn} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">Why Choose Alifaain?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">We deliver excellence in every aspect of your shopping experience</p>
          </motion.div>

          <motion.div variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { icon: ShieldCheck, title: 'Authentic Products', desc: '100% genuine products sourced directly from trusted suppliers.' },
              { icon: Star, title: 'Premium Quality', desc: 'Only the finest ingredients and formulations make it to our store.' },
              { icon: Truck, title: 'Fast Delivery', desc: 'Quick and reliable shipping across Saudi Arabia and beyond.' },
              { icon: CreditCard, title: 'Secure Payment', desc: 'Safe and encrypted payment processing for your peace of mind.' },
            ].map(item => (
              <motion.div key={item.title} variants={staggerItem}>
                <Card className="text-center h-full hover:shadow-lg transition-shadow duration-300 gradient-border">
                  <CardContent className="pt-8 pb-6 flex flex-col items-center">
                    <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <item.icon className="size-7 text-primary" />
                    </div>
                    <h3 className="font-serif font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 sm:py-20 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeIn} viewport={{ once: true }} className="max-w-xl mx-auto text-center">
            <h2 className="font-serif text-3xl font-bold mb-4">Stay in the Loop</h2>
            <p className="text-muted-foreground mb-6">Subscribe for exclusive offers, beauty tips, and new arrivals</p>
            <div className="gradient-border rounded-xl">
              <div className="flex gap-2 p-1.5 bg-card rounded-xl">
                <Input placeholder="Enter your email" type="email" className="border-0 focus-visible:ring-0" />
                <Button className="shrink-0">
                  <Mail className="size-4 mr-2" /> Subscribe
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

// ─── Product Card ────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const { setView } = useAppStore()
  const { addItem } = useCartStore()
  const { selectedCountry } = useAppStore()
  const { toast } = useToast()

  const discountedPrice = product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem({ productId: product.id, name: product.name, price: discountedPrice, quantity: 1, image: product.image || undefined })
    toast({ title: 'Added to cart', description: `${product.name} has been added.` })
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="min-w-[240px] max-w-[280px] snap-start"
    >
      <Card className="overflow-hidden h-full hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
        onClick={() => setView({ view: 'product-detail', params: { id: product.id } })}
      >
        <div className={`relative h-44 ${product.image ? '' : 'bg-gradient-to-br ' + getGradientForCategory(product.category.slug)} flex items-center justify-center overflow-hidden`}>
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <span className="text-4xl font-bold text-white/30 font-serif">{getProductInitials(product.name)}</span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute top-2 right-2 flex gap-1">
            <WishlistButton product={product} />
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="secondary" className="size-8 rounded-full" onClick={handleAdd}>
                <ShoppingCart className="size-3.5" />
              </Button>
            </div>
          </div>
          {product.discount > 0 && (
            <Badge className="absolute top-2 left-2 bg-primary text-gold border-0 text-[10px] font-bold">
              -{product.discount}%
            </Badge>
          )}
          {product.featured && product.discount === 0 && (
            <Badge className="absolute top-2 left-2 bg-white/20 text-white border-0 text-[10px]">
              <Star className="size-3 mr-0.5" /> Featured
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <Badge variant="secondary" className="text-[10px] mb-2">{product.category.name}</Badge>
          <h3 className="font-semibold text-sm mb-1 line-clamp-1">{product.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary">{formatPrice(discountedPrice, selectedCountry)}</span>
              {product.discount > 0 && (
                <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price, selectedCountry)}</span>
              )}
            </div>
            <Button size="sm" onClick={handleAdd} className="h-7 text-xs">
              <Plus className="size-3 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── About View ──────────────────────────────────────────────────────────────

function AboutView() {
  const { setView } = useAppStore()

  const collectionCategories = [
    {
      icon: Sparkles,
      title: 'Skincare',
      desc: 'Authentic organic Moroccan beauty traditions, advanced Korean skincare innovations, and time-honoured Indian formulations rooted in centuries of wellness wisdom.',
    },
    {
      icon: Heart,
      title: 'Wellness & Supplements',
      desc: 'Thoughtfully sourced products designed to support vitality, balance, and overall well-being.',
    },
    {
      icon: Star,
      title: 'Fragrances',
      desc: 'Exquisite perfumes that leave a lasting impression and express individuality with elegance.',
    },
    {
      icon: Package,
      title: 'Literature',
      desc: 'Books that educate, inspire, challenge perspectives, and enrich the mind.',
    },
    {
      icon: ShoppingBag,
      title: 'Fashion & Apparel',
      desc: 'Carefully selected clothing that embodies sophistication, confidence, and timeless style.',
    },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 -mt-px">
        <div className="absolute inset-0">
          <img src="/images/about/our-story.png" alt="About Us" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <Badge className="mb-4 bg-primary/90 text-primary-foreground border-0">
              <Info className="size-3.5 mr-1.5" /> About Us
            </Badge>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white leading-tight">
              Welcome to Alif Aain — Where Timeless Elegance Meets{' '}
              <span className="gold-text">Modern Discovery</span>
            </h1>
            <p className="text-white/80 text-lg sm:text-xl mb-4 max-w-2xl">
              At Alif Aain, we believe that true luxury is not defined by excess, but by discernment.
            </p>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img src="/images/about/our-story.png" alt="Alif Aain" className="w-full h-auto object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Badge variant="secondary" className="mb-4">
                <Award className="size-3.5 mr-1.5" /> Flagship of Standards
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-6">
                Curated with Purpose. <span className="gold-text">Inspired by the World.</span>
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                It is found in the thoughtful selection of exceptional products, the appreciation of authentic craftsmanship, and the pursuit of a life lived with intention.
              </p>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Founded with a vision to bring the world&apos;s finest treasures together under one distinguished destination, Alif Aain is a curated marketplace for those who value quality, heritage, and sophistication. From the sun-kissed argan groves of Morocco to the innovative skincare laboratories of Seoul, from the ancient botanical wisdom of India to the pages of transformative literature, we invite you to discover a world where global excellence meets refined living.
              </p>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                At the heart of our brand lies a simple yet unwavering principle: excellence without compromise. This commitment is reflected in our promise to be the Flagship of Standards—a destination where every product is carefully selected, every partnership is thoughtfully cultivated, and every customer experience is held to the highest level of distinction.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                More than a marketplace, Alif Aain is a celebration of culture, beauty, wellness, knowledge, and style. We are curators of a refined lifestyle, bringing together the world&apos;s most exceptional products for those who appreciate authenticity, quality, and timeless elegance.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => setView({ view: 'products' })} className="gap-2">
                  Explore Products <ArrowRight className="size-4" />
                </Button>
                <Button variant="outline" onClick={() => setView({ view: 'contact' })} className="gap-2">
                  Get in Touch <MessageSquare className="size-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-16 sm:py-20 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="order-2 lg:order-1"
            >
              <Badge variant="secondary" className="mb-4">
                <Target className="size-3.5 mr-1.5" /> Our Philosophy
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-6">
                Every Product Has a <span className="gold-text">Story Worth Telling</span>
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Each item within our collection is chosen with purpose—not only for its quality and effectiveness, but also for the heritage, craftsmanship, and values it represents. Our approach is guided by a commitment to authenticity, excellence, and sophistication, ensuring that every product enriches daily life and transforms ordinary moments into extraordinary experiences.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Whether it is a luxurious skincare ritual, a signature fragrance, an inspiring book, a wellness essential, or a beautifully crafted garment, our purpose is to help our customers embrace a lifestyle defined by refinement, confidence, and purpose.
              </p>
              <div className="space-y-4">
                {[
                  { icon: ShieldCheck, title: 'Authenticity', desc: 'Every product reflects genuine heritage, craftsmanship, and values.' },
                  { icon: Award, title: 'Excellence', desc: 'We uphold the highest standards in quality and customer experience.' },
                  { icon: Sparkles, title: 'Sophistication', desc: 'We curate products that transform everyday moments into something extraordinary.' },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="size-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="order-1 lg:order-2"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img src="/images/about/mission.png" alt="Our Philosophy" className="w-full h-auto object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Collection Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeIn} viewport={{ once: true }} className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <Store className="size-3.5 mr-1.5" /> Our Collection
            </Badge>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
              The Many Facets of <span className="gold-text">Modern Living</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our carefully curated selection reflects the many facets of modern living—and this is only the beginning.
            </p>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {collectionCategories.map(category => (
              <motion.div key={category.title} variants={staggerItem}>
                <Card className="h-full gradient-border hover:shadow-lg transition-shadow">
                  <CardContent className="pt-8 pb-6">
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <category.icon className="size-6 text-primary" />
                    </div>
                    <h3 className="font-serif text-xl font-bold mb-3">{category.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{category.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            <motion.div variants={staggerItem} className="sm:col-span-2 lg:col-span-3">
              <Card className="gradient-border bg-secondary/20 border-dashed">
                <CardContent className="py-8 text-center">
                  <Globe className="size-8 text-primary mx-auto mb-3" />
                  <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    As Alif Aain continues to grow, we will introduce even more exceptional products, brands, and discoveries from around the world—each chosen according to the same uncompromising standards that define our name.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Promise Section */}
      <section className="py-16 sm:py-20 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img src="/images/about/team.png" alt="Our Promise" className="w-full h-auto object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Badge variant="secondary" className="mb-4">
                <Handshake className="size-3.5 mr-1.5" /> Our Promise
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-6">
                Excellence Without <span className="gold-text">Compromise</span>
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Every product that bears the Alif Aain name has been thoughtfully vetted and selected to meet the highest standards of excellence.
              </p>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                We collaborate with trusted artisans, heritage producers, innovative creators, and respected brands who share our dedication to craftsmanship, integrity, and quality. Our commitment extends beyond commerce; it is reflected in every detail of the experience we create for our customers.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                When you choose Alif Aain, you are not simply making a purchase—you are investing in quality, embracing global craftsmanship, and choosing products that reflect a higher standard of living.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Handshake, label: 'Trusted Partners' },
                  { icon: Award, label: 'Highest Standards' },
                  { icon: Star, label: 'Expert Curated' },
                  { icon: ShieldCheck, label: 'Verified Authentic' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 p-3 rounded-lg bg-background">
                    <item.icon className="size-5 text-primary shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            {...fadeIn}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <Badge variant="secondary" className="mb-4">
              <Globe className="size-3.5 mr-1.5" /> Our Vision
            </Badge>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-6">
              Where Heritage Meets <span className="gold-text">Innovation</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              To become a globally trusted destination for discerning individuals seeking the finest products from across the world—where heritage meets innovation, tradition meets modernity, and luxury becomes a way of life.
            </p>
            <div className="space-y-2">
              <p className="font-serif text-2xl sm:text-3xl font-bold gold-text">Alif Aain</p>
              <p className="text-muted-foreground italic">
                Curated with Purpose. Inspired by the World. Defined by Excellence.
              </p>
              <p className="text-muted-foreground pt-4 leading-relaxed">
                Bringing together beauty, wellness, knowledge, and style from around the globe for those who demand nothing less than the exceptional.
              </p>
              <p className="font-serif text-lg font-semibold pt-2">Alif Aain — Flagship of Standards.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            {...fadeIn}
            viewport={{ once: true }}
            className="relative rounded-2xl overflow-hidden p-8 sm:p-12 lg:p-16 text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-emerald-800 to-primary" />
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4">
                Discover the Exceptional
              </h2>
              <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">
                Explore our curated collection of beauty, wellness, knowledge, and style from around the globe.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-white/90 font-semibold gap-2"
                  onClick={() => setView({ view: 'products' })}
                >
                  Shop Now <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white shadow-none gap-2 dark:bg-transparent dark:border-white/40 dark:hover:bg-white/10"
                  onClick={() => setView({ view: 'contact' })}
                >
                  Contact Us <MessageSquare className="size-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

// ─── Contact View ─────────────────────────────────────────────────────────────

function ContactView() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [sending, setSending] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    // Simulate sending
    setTimeout(() => {
      setSending(false)
      setFormData({ name: '', email: '', subject: '', message: '' })
      toast({
        title: 'Message Sent!',
        description: 'Thank you for reaching out. We\'ll get back to you within 24 hours.',
      })
    }, 1500)
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 -mt-px">
        <div className="absolute inset-0">
          <img src="/images/contact/hero.png" alt="Contact Us" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <Badge className="mb-4 bg-primary/90 text-primary-foreground border-0">
              <MessageSquare className="size-3.5 mr-1.5" /> Get in Touch
            </Badge>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white leading-tight">
              We&apos;d Love to <span className="gold-text">Hear From You</span>
            </h1>
            <p className="text-white/80 text-lg sm:text-xl mb-8 max-w-lg">
              Whether you have a question about our products, need skincare advice, or just want to say hello — we&apos;re here for you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
          >
            {[
              {
                icon: Mail,
                title: 'Email Us',
                detail: CONTACT_EMAIL,
                sub: 'We reply within 24 hours',
                color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              },
              {
                icon: Phone,
                title: 'Call Us',
                detail: CONTACT_PHONE,
                sub: 'Sun–Thu, 9AM–6PM AST',
                color: 'bg-primary/10 text-primary',
              },
              {
                icon: MapPin,
                title: 'Visit Us',
                detail: 'Riyadh, Saudi Arabia',
                sub: 'King Fahd Road District',
                color: 'bg-gold/15 text-gold',
              },
              {
                icon: Clock,
                title: 'Business Hours',
                detail: 'Sun–Thu: 9AM–6PM',
                sub: 'Fri–Sat: Closed',
                color: 'bg-green-500/10 text-green-600 dark:text-green-400',
              },
            ].map(item => (
              <motion.div key={item.title} variants={staggerItem}>
                <Card className="h-full hover:shadow-lg transition-shadow gradient-border">
                  <CardContent className="pt-6 pb-6 flex flex-col items-center text-center">
                    <div className={`size-14 rounded-full ${item.color} flex items-center justify-center mb-4`}>
                      <item.icon className="size-7" />
                    </div>
                    <h3 className="font-serif font-semibold text-lg mb-1">{item.title}</h3>
                    <p className="font-medium text-sm mb-1">{item.detail}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Contact Form + Store Image */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="font-serif text-2xl">Send Us a Message</CardTitle>
                  <CardDescription>Fill out the form below and we&apos;ll get back to you as soon as possible.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact-name">Your Name</Label>
                        <Input
                          id="contact-name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          required
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-email">Email Address</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          required
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="contact-subject">Subject</Label>
                      <Select value={formData.subject} onValueChange={val => setFormData(prev => ({ ...prev, subject: val }))}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="product">Product Question</SelectItem>
                          <SelectItem value="order">Order Support</SelectItem>
                          <SelectItem value="wholesale">Wholesale Inquiry</SelectItem>
                          <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                          <SelectItem value="feedback">Feedback</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="contact-message">Message</Label>
                      <Textarea
                        id="contact-message"
                        placeholder="Tell us how we can help..."
                        value={formData.message}
                        onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                        required
                        rows={5}
                        className="mt-1.5"
                      />
                    </div>
                    <Button type="submit" size="lg" className="w-full gap-2" disabled={sending}>
                      {sending ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send className="size-4" /> Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Store Image + Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col gap-6"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl flex-1">
                <img src="/images/contact/store.png" alt="Alifaain Store" className="w-full h-full object-cover min-h-[300px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                  <Badge className="bg-primary text-primary-foreground border-0 mb-3">
                    <Building2 className="size-3.5 mr-1.5" /> Our Flagship Store
                  </Badge>
                  <h3 className="font-serif text-2xl font-bold text-white mb-2">Visit Us in Riyadh</h3>
                  <p className="text-white/80 text-sm">King Fahd Road, Olaya District, Riyadh, Saudi Arabia</p>
                </div>
              </div>

              {/* Social Links */}
              <Card className="gradient-border">
                <CardContent className="p-6">
                  <h4 className="font-serif font-semibold text-lg mb-4">Follow Us on Social Media</h4>
                  <p className="text-sm text-muted-foreground mb-4">Stay updated with our latest products, beauty tips, and exclusive offers.</p>
                  <div className="flex flex-wrap gap-3">
                    {SOCIAL_LINKS.map(social => (
                      <SocialLinkButton
                        key={social.label}
                        href={social.href}
                        label={social.label}
                        icon={social.icon}
                        variant="outline"
                        size="lg"
                        showLabel
                        className="gap-2 hover:bg-primary/10 hover:text-primary"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* FAQ Quick Links */}
              <Card>
                <CardContent className="p-6">
                  <h4 className="font-serif font-semibold text-lg mb-4">Frequently Asked Questions</h4>
                  <div className="space-y-3">
                    {[
                      { q: 'What are your shipping options?', a: 'Free shipping on orders over 200 SAR across Saudi Arabia.' },
                      { q: 'Are your products authentic?', a: 'Yes, 100% genuine products sourced directly from trusted suppliers.' },
                      { q: 'What is your return policy?', a: '30-day hassle-free returns on all unopened products.' },
                    ].map(faq => (
                      <div key={faq.q} className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-sm font-medium mb-1">{faq.q}</p>
                        <p className="text-xs text-muted-foreground">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Products View ───────────────────────────────────────────────────────────

function ProductsView({ products }: { products: Product[] }) {
  const { selectedCountry, selectedCategory, setSelectedCategory, searchQuery, setSearchQuery } = useAppStore()
  const [sortBy, setSortBy] = useState('name-asc')
  const [priceRange, setPriceRange] = useState([0, 500])
  const [selectedCats, setSelectedCats] = useState<string[]>(selectedCategory ? [selectedCategory] : [])
  const [showFilters, setShowFilters] = useState(false)
  const [allCategories, setAllCategories] = useState<Category[]>([])

  // Fetch all categories from API
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAllCategories(data)
      })
      .catch(() => {})
  }, [])

  // Count products per category
  const productCountByCategory = useMemo(() => {
    const map = new Map<string, number>()
    products.forEach(p => {
      map.set(p.categoryId, (map.get(p.categoryId) || 0) + 1)
    })
    return map
  }, [products])

  // Merge store category with local filters
  const activeCategories = useMemo(() => {
    if (selectedCategory) return [selectedCategory]
    return selectedCats
  }, [selectedCategory, selectedCats])

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => p.status === 'active')

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }

    if (activeCategories.length > 0) {
      result = result.filter(p => activeCategories.includes(p.category.slug))
    }

    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])

    switch (sortBy) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break
      case 'price-desc': result.sort((a, b) => b.price - a.price); break
      case 'name-asc': result.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'name-desc': result.sort((a, b) => b.name.localeCompare(a.name)); break
    }

    return result
  }, [products, searchQuery, activeCategories, priceRange, sortBy])

  const toggleCat = (slug: string) => {
    setSelectedCats(prev => prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug])
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        {/* Page Header with Category Navigation */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-1">Shop All</h1>
              <p className="text-muted-foreground text-sm">Browse our entire collection across all categories</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
            </div>
          </div>

          {/* Horizontal Category Navigation Bar */}
          <div className="relative -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-card/80 backdrop-blur-sm border-y border-border/50">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {/* All Products Pill */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setSelectedCategory(null); setSelectedCats([]) }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 shrink-0 ${
                  activeCategories.length === 0
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShoppingBag className="size-4" />
                <span>All Products</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeCategories.length === 0 ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {products.filter(p => p.status === 'active').length}
                </span>
              </motion.button>

              <div className="w-px h-8 bg-border/50 shrink-0" />

              {/* Category Pills */}
              {allCategories.map(cat => {
                const count = productCountByCategory.get(cat.id) || 0
                const isComingSoon = cat.status === 'coming_soon'
                const isActive = activeCategories.includes(cat.slug)
                return (
                  <motion.button
                    key={cat.id}
                    whileHover={!isComingSoon ? { scale: 1.03 } : {}}
                    whileTap={!isComingSoon ? { scale: 0.97 } : {}}
                    onClick={() => { if (!isComingSoon) { setSelectedCategory(cat.slug); setSelectedCats([cat.slug]) } }}
                    disabled={isComingSoon}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 shrink-0 ${
                      isComingSoon
                        ? 'opacity-40 cursor-not-allowed bg-secondary/50 text-muted-foreground'
                        : isActive
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                          : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground cursor-pointer'
                    }`}
                  >
                    <span className="text-base">{categoryIcons[cat.slug] || '📦'}</span>
                    <span>{cat.name}</span>
                    {isComingSoon ? (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-background/50 text-muted-foreground">Soon</Badge>
                    ) : (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {count}
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="price-asc">Price: Low-High</SelectItem>
                <SelectItem value="price-desc">Price: High-Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-56 shrink-0`}>
            <Card>
              <CardContent className="p-4 space-y-6">
                <div>
                  <h4 className="font-semibold text-sm mb-3">Categories</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={activeCategories.length === 0} onCheckedChange={() => { setSelectedCategory(null); setSelectedCats([]) }} />
                      <span>🛍️ All Products</span>
                    </label>
                    {allCategories.map(cat => {
                      const isComingSoon = cat.status === 'coming_soon'
                      return (
                        <label key={cat.id} className={`flex items-center gap-2 text-sm ${isComingSoon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <Checkbox
                            checked={selectedCats.includes(cat.slug)}
                            onCheckedChange={() => { if (!isComingSoon) toggleCat(cat.slug) }}
                            disabled={isComingSoon}
                          />
                          <span>{categoryIcons[cat.slug] || '📦'} {cat.name}</span>
                          {isComingSoon && <Badge variant="secondary" className="text-[9px] ml-auto py-0 px-1.5">Soon</Badge>}
                        </label>
                      )
                    })}
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-3">Price Range (SAR)</h4>
                  <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={500} step={10} className="mt-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{priceRange[0]}</span>
                    <span>{priceRange[1]}</span>
                  </div>
                </div>
                <Separator />
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setSelectedCategory(null); setSelectedCats([]); setPriceRange([0, 500]); setSearchQuery('') }}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <Package className="size-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your filters or search query.</p>
                <Button variant="outline" onClick={() => { setSelectedCats([]); setPriceRange([0, 500]); setSearchQuery('') }}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                  <ProductGridCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function ProductGridCard({ product }: { product: Product }) {
  const { setView } = useAppStore()
  const { addItem } = useCartStore()
  const { selectedCountry } = useAppStore()
  const { toast } = useToast()

  const discountedPrice = product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem({ productId: product.id, name: product.name, price: discountedPrice, quantity: 1, image: product.image || undefined })
    toast({ title: 'Added to cart', description: `${product.name} has been added.` })
  }

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
      <Card className="overflow-hidden h-full hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
        onClick={() => setView({ view: 'product-detail', params: { id: product.id } })}
      >
        <div className={`relative h-48 ${product.image ? '' : 'bg-gradient-to-br ' + getGradientForCategory(product.category.slug)} flex items-center justify-center overflow-hidden`}>
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <span className="text-5xl font-bold text-white/20 font-serif">{getProductInitials(product.name)}</span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <div className="absolute top-2 right-2 flex gap-1">
            <WishlistButton product={product} className="opacity-100" />
          </div>
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button size="sm" onClick={handleAdd} className="h-8">
              <ShoppingCart className="size-3.5 mr-1" /> Add to Cart
            </Button>
          </div>
          {product.discount > 0 && (
            <Badge className="absolute top-2 left-2 bg-primary text-gold border-0 text-[10px] font-bold">
              -{product.discount}%
            </Badge>
          )}
          {product.featured && product.discount === 0 && (
            <Badge className="absolute top-2 left-2 bg-white/20 text-white border-0 text-[10px]">
              <Star className="size-3 mr-0.5" /> Featured
            </Badge>
          )}
          {product.stock < 10 && (
            <Badge variant="destructive" className="absolute top-2 right-12 text-[10px]">Low Stock</Badge>
          )}
        </div>
        <CardContent className="p-4">
          <Badge variant="secondary" className="text-[10px] mb-2">{product.category.name}</Badge>
          <h3 className="font-semibold mb-1 line-clamp-1">{product.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary text-lg">{formatPrice(discountedPrice, selectedCountry)}</span>
              {product.discount > 0 && (
                <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price, selectedCountry)}</span>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={handleAdd} className="h-7 text-xs">
              <Plus className="size-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Product Detail View ─────────────────────────────────────────────────────

function ProductDetailView({ products }: { products: Product[] }) {
  const { currentView, setView, selectedCountry } = useAppStore()
  const { addItem } = useCartStore()
  const { toast } = useToast()
  const [quantity, setQuantity] = useState(1)
  const [selectedImageIdx, setSelectedImageIdx] = useState(0)

  const product = useMemo(() => {
    const id = currentView.params?.id
    return products.find(p => p.id === id) || null
  }, [products, currentView.params])

  // Build all images array: primary image first, then additional images
  const allImages = useMemo(() => {
    if (!product) return []
    const imgs: string[] = []
    if (product.image) imgs.push(product.image)
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img: string) => {
        if (img && !imgs.includes(img)) imgs.push(img)
      })
    }
    return imgs
  }, [product])

  const relatedProducts = useMemo(() => {
    if (!product) return []
    return products.filter(p => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4)
  }, [products, product])

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="font-serif text-2xl font-bold mb-4">Product Not Found</h2>
        <Button onClick={() => setView({ view: 'products' })}>Browse Products</Button>
      </div>
    )
  }

  const handleAddToCart = () => {
    const finalPrice = product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price
    addItem({ productId: product.id, name: product.name, price: finalPrice, quantity, image: product.image || undefined })
    toast({ title: 'Added to cart', description: `${quantity}x ${product.name} added to your cart.` })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        {/* Breadcrumb */}
        <button onClick={() => setView({ view: 'products' })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="size-4" /> Back to Products
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Image Gallery */}
          <div className="space-y-3">
            {/* Main Image */}
            <div className={`relative rounded-2xl overflow-hidden ${allImages.length > 0 ? '' : 'bg-gradient-to-br ' + getGradientForCategory(product.category.slug)} aspect-square flex items-center justify-center group`}>
              {allImages.length > 0 ? (
                <>
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={selectedImageIdx}
                      src={allImages[selectedImageIdx]}
                      alt={`${product.name} - Image ${selectedImageIdx + 1}`}
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  </AnimatePresence>
                  {/* Navigation arrows */}
                  {allImages.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white dark:bg-black/50 dark:hover:bg-black/70"
                        onClick={() => setSelectedImageIdx(selectedImageIdx > 0 ? selectedImageIdx - 1 : allImages.length - 1)}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white dark:bg-black/50 dark:hover:bg-black/70"
                        onClick={() => setSelectedImageIdx(selectedImageIdx < allImages.length - 1 ? selectedImageIdx + 1 : 0)}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                      {/* Image counter */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                        {selectedImageIdx + 1} / {allImages.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <span className="text-8xl font-bold text-white/15 font-serif">{getProductInitials(product.name)}</span>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              <div className="absolute top-4 right-4 z-10">
                <WishlistButton product={product} className="size-10 bg-white/90 hover:bg-white dark:bg-black/50 dark:hover:bg-black/70" />
              </div>
              <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
                <Badge className="bg-white/20 text-white border-0">{product.category.name}</Badge>
                {product.discount > 0 && <Badge className="bg-primary text-gold border-0 font-bold">-{product.discount}% OFF</Badge>}
                {product.featured && product.discount === 0 && <Badge className="bg-white/20 text-white border-0"><Star className="size-3 mr-1" />Featured</Badge>}
              </div>
            </div>
            {/* Thumbnail Strip */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`shrink-0 size-16 sm:size-20 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === selectedImageIdx ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/30'
                    }`}
                  >
                    <img src={img} alt={`${product.name} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <Badge variant="secondary" className="w-fit mb-3">{categoryIcons[product.category.slug]} {product.category.name}</Badge>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-4">{product.name}</h1>
            <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">{product.description}</p>

            <div className="mb-6">
              {product.discount > 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-primary">{formatPrice(product.price * (1 - product.discount / 100), selectedCountry)}</span>
                  <span className="text-lg text-muted-foreground line-through">{formatPrice(product.price, selectedCountry)}</span>
                  <Badge className="bg-primary text-gold border-0">Save {product.discount}%</Badge>
                </div>
              ) : (
                <span className="text-3xl font-bold text-primary">{formatPrice(product.price, selectedCountry)}</span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Package className="size-4" />
              {product.stock > 0 ? (
                <span className={product.stock < 10 ? 'text-destructive' : ''}>
                  {product.stock < 10 ? `Only ${product.stock} left in stock` : 'In Stock'}
                </span>
              ) : (
                <span className="text-destructive">Out of Stock</span>
              )}
            </div>

            <Separator className="my-6" />

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium">Quantity:</span>
              <div className="flex items-center border rounded-lg">
                <Button variant="ghost" size="icon" className="size-10" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus className="size-4" />
                </Button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <Button variant="ghost" size="icon" className="size-10" onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1 sm:flex-none px-12 text-base" onClick={handleAddToCart} disabled={product.stock === 0}>
                <ShoppingCart className="size-5 mr-2" /> Add to Cart
              </Button>
              <WishlistButton product={product} variant="inline" className="flex-1 sm:flex-none" />
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl font-bold mb-6">Related Products</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedProducts.map(p => (
                <ProductGridCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Cart View ───────────────────────────────────────────────────────────────

function CartView() {
  const { items, removeItem, updateQuantity, totalPrice } = useCartStore()
  const { applied: appliedCoupon } = useCouponStore()
  const { setView, selectedCountry } = useAppStore()
  const total = totalPrice()
  const couponDiscount = appliedCoupon?.discountAmount ?? 0
  const shipping = total >= 200 ? 0 : 25
  const orderTotal = Math.max(0, total - couponDiscount + shipping)

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <motion.div {...fadeIn}>
          <ShoppingBag className="size-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2">Your Cart is Empty</h2>
          <p className="text-muted-foreground mb-6">Looks like you haven&apos;t added anything yet.</p>
          <Button onClick={() => setView({ view: 'products' })}>
            Continue Shopping <ArrowRight className="size-4 ml-1" />
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        <h1 className="font-serif text-3xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <Card key={item.productId} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="size-20 rounded-lg overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary/40 font-serif">{getProductInitials(item.name)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1 truncate">{item.name}</h3>
                      <p className="text-primary font-bold">{formatPrice(item.price, selectedCountry)}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center border rounded-md">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}>
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                            <Plus className="size-3" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeItem(item.productId)}>
                          <Trash2 className="size-4 mr-1" /> Remove
                        </Button>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold">{formatPrice(item.price * item.quantity, selectedCountry)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="font-serif">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CouponInput subtotal={total} countryCode={selectedCountry} />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(total, selectedCountry)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-primary">
                    <span className="flex items-center gap-1">
                      <Tag className="size-3.5" /> Coupon ({appliedCoupon?.code})
                    </span>
                    <span>-{formatPrice(couponDiscount, selectedCountry)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? <span className="text-primary font-medium">Free</span> : formatPrice(shipping, selectedCountry)}</span>
                </div>
                {total < 200 && (
                  <p className="text-xs text-muted-foreground">Add {formatPrice(200 - total, selectedCountry)} more for free shipping!</p>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(orderTotal, selectedCountry)}</span>
                </div>
                <Button className="w-full mt-4" size="lg" onClick={() => setView({ view: 'checkout' })}>
                  Proceed to Checkout
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setView({ view: 'products' })}>
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Wishlist View ───────────────────────────────────────────────────────────

function WishlistView({ products }: { products: Product[] }) {
  const { items, removeItem } = useWishlistStore()
  const { addItem } = useCartStore()
  const { setView, selectedCountry } = useAppStore()
  const { toast } = useToast()

  const handleAddToCart = (item: typeof items[0], product?: Product) => {
    const price = product ? getProductWishlistPrice(product) : item.price
    addItem({
      productId: item.productId,
      name: item.name,
      price,
      quantity: 1,
      image: item.image,
    })
    toast({ title: 'Added to cart', description: `${item.name} has been added to your cart.` })
  }

  const handleMoveToCart = (item: typeof items[0], product?: Product) => {
    handleAddToCart(item, product)
    removeItem(item.productId)
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <motion.div {...fadeIn}>
          <Heart className="size-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2">Your Wishlist is Empty</h2>
          <p className="text-muted-foreground mb-6">Save products you love and come back to them anytime.</p>
          <Button onClick={() => setView({ view: 'products' })}>
            Explore Products <ArrowRight className="size-4 ml-1" />
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">My Wishlist</h1>
            <p className="text-muted-foreground text-sm mt-1">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
          </div>
          <Button variant="outline" onClick={() => setView({ view: 'cart' })} className="gap-2">
            <ShoppingCart className="size-4" /> View Cart
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => {
            const product = products.find(p => p.id === item.productId)
            const price = product ? getProductWishlistPrice(product) : item.price
            const outOfStock = product?.stock === 0

            return (
              <Card key={item.productId} className="overflow-hidden group">
                <div
                  className="relative h-44 cursor-pointer"
                  onClick={() => product && setView({ view: 'product-detail', params: { id: product.id } })}
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradientForCategory(product?.category.slug || 'morocco')} flex items-center justify-center`}>
                      <span className="text-3xl font-bold text-white/30 font-serif">{getProductInitials(item.name)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  {product && (
                    <div className="absolute top-2 right-2" onClick={e => e.stopPropagation()}>
                      <WishlistButton product={product} />
                    </div>
                  )}
                  {product?.discount ? (
                    <Badge className="absolute top-2 left-2 bg-primary text-gold border-0 text-[10px] font-bold">
                      -{product.discount}%
                    </Badge>
                  ) : null}
                </div>
                <CardContent className="p-4">
                  {product && (
                    <Badge variant="secondary" className="text-[10px] mb-2">{product.category.name}</Badge>
                  )}
                  <h3 className="font-semibold mb-1 line-clamp-1">{item.name}</h3>
                  <p className="text-primary font-bold mb-4">{formatPrice(price, selectedCountry)}</p>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => handleMoveToCart(item, product)}
                      disabled={outOfStock}
                    >
                      <ShoppingCart className="size-4" /> Move to Cart
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => handleAddToCart(item, product)}
                        disabled={outOfStock}
                      >
                        <Plus className="size-4" /> Add to Cart
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          removeItem(item.productId)
                          toast({ title: 'Removed', description: `${item.name} removed from wishlist.` })
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  {outOfStock && (
                    <p className="text-xs text-destructive mt-2">Currently out of stock</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Checkout View ───────────────────────────────────────────────────────────

function CheckoutView() {
  const { items, totalPrice, clearCart } = useCartStore()
  const { applied: appliedCoupon, clearApplied } = useCouponStore()
  const { setView, selectedCountry } = useAppStore()
  const { toast } = useToast()
  const [step, setStep] = useState<'info' | 'payment' | 'processing' | 'success' | 'failed'>('info')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [paymentMethod, setPaymentMethod] = useState<string>('card')
  const [cardForm, setCardForm] = useState({ number: '', expiry: '', cvc: '', name: '' })

  const total = totalPrice()
  const couponDiscount = appliedCoupon?.discountAmount ?? 0
  const shipping = total >= 200 ? 0 : 25
  const codFee = paymentMethod === 'cod' ? 10 : 0
  const grandTotal = Math.max(0, total - couponDiscount + shipping + codFee)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    // Format card number with spaces
    if (e.target.name === 'number') {
      value = value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 19)
    }
    // Format expiry MM/YY
    if (e.target.name === 'expiry') {
      value = value.replace(/\D/g, '').replace(/(\d{2})(?=\d)/, '$1/').slice(0, 5)
    }
    // CVC max 4 digits
    if (e.target.name === 'cvc') {
      value = value.replace(/\D/g, '').slice(0, 4)
    }
    setCardForm(prev => ({ ...prev, [e.target.name]: value }))
  }

  const handleInfoSubmit = () => {
    if (!form.name || !form.email) {
      toast({ title: 'Missing fields', description: 'Please fill in your name and email.', variant: 'destructive' })
      return
    }
    setStep('payment')
  }

  const handlePaymentSubmit = async () => {
    if (paymentMethod === 'card' || paymentMethod === 'mada') {
      if (!cardForm.number || !cardForm.expiry || !cardForm.cvc || !cardForm.name) {
        toast({ title: 'Missing card details', description: 'Please fill in all card fields.', variant: 'destructive' })
        return
      }
    }
    if (paymentMethod === 'applepay') {
      // Simulate Apple Pay confirmation
    }

    setIsSubmitting(true)
    setStep('processing')

    try {
      // 1. Create the order first
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.phone || undefined,
          items: items.map(i => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
          currency: getCountryByCode(selectedCountry).currency,
          country: selectedCountry,
          paymentMethod,
          couponCode: appliedCoupon?.code,
        }),
      })
      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        toast({ title: 'Error', description: orderData.error || 'Failed to create order.', variant: 'destructive' })
        setStep('payment')
        setIsSubmitting(false)
        return
      }

      setOrderId(orderData.id)

      // 2. Process the payment
      const cardLast4 = cardForm.number ? cardForm.number.replace(/\s/g, '').slice(-4) : undefined

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      const paymentRes = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.id,
          paymentMethod,
          cardLast4,
        }),
      })
      const paymentData = await paymentRes.json()

      if (paymentData.success) {
        setTransactionId(paymentData.transactionId)
        setStep('success')
        clearCart()
        clearApplied()
        toast({ title: 'Payment successful!', description: 'Your order has been placed.' })
      } else {
        setTransactionId(paymentData.transactionId || '')
        setStep('failed')
        toast({ title: 'Payment failed', description: paymentData.message || 'Payment was declined.', variant: 'destructive' })
      }
    } catch {
      setStep('failed')
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' })
    }
    setIsSubmitting(false)
  }

  // Payment method configs
  const paymentMethods = [
    { id: 'card', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard', color: 'from-emerald-800 to-green-900' },
    { id: 'mada', label: 'Mada', icon: Banknote, desc: 'Saudi debit cards', color: 'from-green-800 to-teal-900' },
    { id: 'applepay', label: 'Apple Pay', icon: Smartphone, desc: 'Quick & secure', color: 'from-emerald-950 to-green-950' },
    { id: 'cod', label: 'Cash on Delivery', icon: Wallet, desc: 'Pay when received', color: 'from-emerald-800 to-green-900' },
  ]

  // ─── Success State ──────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="size-10 text-primary" />
          </div>
          <h2 className="font-serif text-3xl font-bold mb-4">Payment Successful!</h2>
          <p className="text-muted-foreground mb-2">Thank you for your purchase.</p>
          <p className="text-sm text-muted-foreground mb-1">Order ID: <span className="font-mono text-foreground">{orderId.slice(0, 12)}</span></p>
          <p className="text-sm text-muted-foreground mb-1">Transaction: <span className="font-mono text-foreground">{transactionId}</span></p>
          <Badge className="mt-3 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" variant="secondary">
            <CheckCircle2 className="size-3 mr-1" /> Payment Confirmed
          </Badge>
          <div className="mt-8 flex gap-4 justify-center">
            <Button onClick={() => setView({ view: 'products' })}>Continue Shopping</Button>
            <Button variant="outline" onClick={() => setView({ view: 'home' })}>Back to Home</Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── Failed State ───────────────────────────────────────────────────────
  if (step === 'failed') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div className="size-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="size-10 text-destructive" />
          </div>
          <h2 className="font-serif text-3xl font-bold mb-4">Payment Failed</h2>
          <p className="text-muted-foreground mb-2">Your payment could not be processed.</p>
          {transactionId && <p className="text-sm text-muted-foreground mb-4">Transaction: <span className="font-mono">{transactionId}</span></p>}
          <div className="mt-6 flex gap-4 justify-center">
            <Button onClick={() => { setStep('payment'); setTransactionId('') }}>Try Again</Button>
            <Button variant="outline" onClick={() => setView({ view: 'cart' })}>Back to Cart</Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── Processing State ───────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <RefreshCw className="size-10 text-primary animate-spin" />
          </div>
          <h2 className="font-serif text-3xl font-bold mb-4">Processing Payment</h2>
          <p className="text-muted-foreground">Please wait while we process your payment...</p>
          <p className="text-sm text-muted-foreground mt-2">Do not close this page.</p>
        </motion.div>
      </div>
    )
  }

  // ─── Empty Cart ─────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <motion.div {...fadeIn}>
          <ShoppingBag className="size-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2">Nothing to Checkout</h2>
          <p className="text-muted-foreground mb-6">Your cart is empty.</p>
          <Button onClick={() => setView({ view: 'products' })}>Shop Now</Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        <button onClick={() => setView({ view: 'cart' })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="size-4" /> Back to Cart
        </button>

        <h1 className="font-serif text-3xl font-bold mb-2">Checkout</h1>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['info', 'payment'].map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => { if (s === 'info') setStep('info') }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  step === s ? 'bg-primary text-primary-foreground' : s === 'info' && step === 'payment' ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary' : 'bg-secondary text-muted-foreground'
                }`}
              >
                {s === 'info' && step === 'payment' ? <Check className="size-4" /> : <span>{i + 1}</span>}
                {s === 'info' ? 'Information' : 'Payment'}
              </button>
              {i === 0 && <ChevronRight className="size-4 text-muted-foreground" />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* ─── Step 1: Customer Info ──────────────────────────────── */}
            {step === 'info' && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <UserCircle className="size-5 text-primary" /> Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" name="name" placeholder="Your full name" value={form.name} onChange={handleChange} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" name="email" type="email" placeholder="your@email.com" value={form.email} onChange={handleChange} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <PhoneInput
                      id="phone"
                      value={form.phone}
                      onChange={(phone) => setForm((prev) => ({ ...prev, phone }))}
                      defaultCountryCode={selectedCountry === 'EU' ? 'SA' : selectedCountry}
                      className="mt-1.5"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" size="lg" onClick={handleInfoSubmit}>
                    Continue to Payment <ArrowRight className="size-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* ─── Step 2: Payment ──────────────────────────────────── */}
            {step === 'payment' && (
              <div className="space-y-6">
                {/* Customer Info Summary */}
                <Card className="border-primary/20 dark:border-primary/30">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{form.name}</p>
                        <p className="text-xs text-muted-foreground">{form.email}{form.phone ? ` • ${form.phone}` : ''}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep('info')}>Edit</Button>
                  </CardContent>
                </Card>

                {/* Payment Method Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="font-serif flex items-center gap-2">
                      <CreditCard className="size-5 text-primary" /> Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {paymentMethods.map(pm => (
                      <button
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          paymentMethod === pm.id
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/40 hover:bg-secondary/50'
                        }`}
                      >
                        <div className={`size-12 rounded-xl bg-gradient-to-br ${pm.color} flex items-center justify-center text-white shrink-0`}>
                          <pm.icon className="size-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{pm.label}</p>
                          <p className="text-xs text-muted-foreground">{pm.desc}</p>
                        </div>
                        <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          paymentMethod === pm.id ? 'border-primary' : 'border-muted-foreground/30'
                        }`}>
                          {paymentMethod === pm.id && <div className="size-2.5 rounded-full bg-primary" />}
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Card Details Form (for card/mada) */}
                {(paymentMethod === 'card' || paymentMethod === 'mada') && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-serif text-base flex items-center gap-2">
                        <Lock className="size-4 text-primary" /> Card Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="cardName">Cardholder Name</Label>
                        <Input id="cardName" name="name" placeholder="Name on card" value={cardForm.name} onChange={handleCardChange} className="mt-1.5" />
                      </div>
                      <div>
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <div className="relative mt-1.5">
                          <Input id="cardNumber" name="number" placeholder="4242 4242 4242 4242" value={cardForm.number} onChange={handleCardChange} className="pr-12 font-mono" />
                          <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="cardExpiry">Expiry Date</Label>
                          <Input id="cardExpiry" name="expiry" placeholder="MM/YY" value={cardForm.expiry} onChange={handleCardChange} className="mt-1.5 font-mono" />
                        </div>
                        <div>
                          <Label htmlFor="cardCvc">CVC</Label>
                          <Input id="cardCvc" name="cvc" placeholder="123" value={cardForm.cvc} onChange={handleCardChange} className="mt-1.5 font-mono" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Lock className="size-3" />
                        <span>Your payment is secured with 256-bit SSL encryption</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Apple Pay notice */}
                {paymentMethod === 'applepay' && (
                  <Card className="border-gray-300 dark:border-gray-700">
                    <CardContent className="p-6 text-center">
                      <Smartphone className="size-12 text-gray-600 dark:text-gray-400 mx-auto mb-3" />
                      <p className="font-medium mb-1">Apple Pay</p>
                      <p className="text-sm text-muted-foreground">Click &quot;Pay Now&quot; to confirm with Apple Pay. You&apos;ll see a confirmation prompt on your device.</p>
                    </CardContent>
                  </Card>
                )}

                {/* COD notice */}
                {paymentMethod === 'cod' && (
                  <Card className="border-emerald-300 dark:border-emerald-800">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-800 to-green-900 flex items-center justify-center text-white shrink-0">
                          <Wallet className="size-6" />
                        </div>
                        <div>
                          <p className="font-medium mb-1">Cash on Delivery</p>
                          <p className="text-sm text-muted-foreground">Pay when your order arrives. A small COD fee of SAR 10 may apply. Please have exact change ready.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Pay Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePaymentSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <><RefreshCw className="size-4 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <>
                      <Lock className="size-4 mr-2" />
                      Pay {formatPrice(grandTotal, selectedCountry)}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="font-serif">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CouponInput subtotal={total} countryCode={selectedCountry} />
                <ScrollArea className="max-h-48">
                  {items.map(item => (
                    <div key={item.productId} className="flex justify-between text-sm py-1.5">
                      <span className="truncate mr-2">{item.name} x{item.quantity}</span>
                      <span className="shrink-0">{formatPrice(item.price * item.quantity, selectedCountry)}</span>
                    </div>
                  ))}
                </ScrollArea>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(total, selectedCountry)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-primary">
                    <span className="flex items-center gap-1">
                      <Tag className="size-3.5" /> Coupon ({appliedCoupon?.code})
                    </span>
                    <span>-{formatPrice(couponDiscount, selectedCountry)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? <span className="text-primary">Free</span> : formatPrice(shipping, selectedCountry)}</span>
                </div>
                {paymentMethod === 'cod' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">COD Fee</span>
                    <span>{formatPrice(codFee, selectedCountry)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(grandTotal, selectedCountry)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span>Secure checkout • 256-bit SSL</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

function AdminDashboard() {
  const { setView } = useAppStore()
  const { selectedCountry } = useAppStore()
  const { user } = useAuthStore()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const statCards = [
    { title: 'Total Products', value: stats?.totalProducts ?? 0, icon: Package, color: 'from-emerald-800 to-green-900' },
    { title: 'Total Orders', value: stats?.totalOrders ?? 0, icon: ClipboardList, color: 'from-green-800 to-emerald-700' },
    { title: 'Total Revenue', value: stats?.totalRevenue ?? 0, icon: DollarSign, color: 'from-primary to-emerald-400', isPrice: true },
    { title: 'Paid Revenue', value: stats?.paidRevenue ?? 0, icon: CircleDollarSign, color: 'from-emerald-700 to-green-800', isPrice: true },
  ]

  const chartData = useMemo(() => {
    if (!stats?.monthlyRevenue) return []
    return stats.monthlyRevenue.map(d => ({
      month: d.month ? new Date(d.month + '-01').toLocaleDateString('en', { month: 'short' }) : 'N/A',
      revenue: d.revenue || 0,
    }))
  }, [stats])

  const engagementChartData = useMemo(() => {
    if (!stats?.engagement?.dailyEngagement) return []
    return stats.engagement.dailyEngagement.map(d => ({
      day: d.day ? new Date(d.day).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : 'N/A',
      pageViews: d.pageViews,
      uniqueVisitors: d.uniqueVisitors,
    }))
  }, [stats])

  const topPagesChartData = useMemo(() => {
    if (!stats?.engagement?.topPages) return []
    return stats.engagement.topPages.map(p => ({
      page: PAGE_LABELS[p.page] || p.page,
      views: p.views,
    }))
  }, [stats])

  const engagement = stats?.engagement

  const statusColors = royalOrderStatusColors

  const paymentStatusColors = royalPaymentStatusColors

  const paymentMethodLabels: Record<string, string> = {
    card: '💳 Credit Card',
    mada: '🏦 Mada',
    applepay: '🍎 Apple Pay',
    cod: '💵 Cash on Delivery',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Overview of your store performance</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {hasPermission(user?.permissions, 'products', 'view') && (
              <Button variant="outline" onClick={() => setView({ view: 'admin-products' })}>
                <Boxes className="size-4 mr-1" /> Products
              </Button>
            )}
            {hasPermission(user?.permissions, 'categories', 'view') && (
              <Button variant="outline" onClick={() => setView({ view: 'admin-categories' })}>
                <Tag className="size-4 mr-1" /> Categories
              </Button>
            )}
            {hasPermission(user?.permissions, 'orders', 'view') && (
              <Button variant="outline" onClick={() => setView({ view: 'admin-orders' })}>
                <ClipboardList className="size-4 mr-1" /> Orders
              </Button>
            )}
            {isSuperAdmin(user?.adminRole) && (
              <Button variant="outline" onClick={() => setView({ view: 'admin-staff' })}>
                <UsersRound className="size-4 mr-1" /> Staff
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statCards.map(card => (
                <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className={`bg-gradient-to-r ${card.color} p-4 text-white`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white/80 text-sm">{card.title}</p>
                            <p className="text-2xl font-bold mt-1">
                              {card.isPrice ? formatPrice(card.value, selectedCountry) : card.value.toLocaleString()}
                            </p>
                          </div>
                          <card.icon className="size-8 text-white/40" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Customer Engagement */}
            {engagement && (
              <>
                <div className="mb-6">
                  <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
                    <Users className="size-6 text-primary" /> Customer Engagement
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">Website activity over the last 30 days</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { title: 'Unique Visitors', value: engagement.uniqueVisitors30d, icon: Users, color: 'from-emerald-800 to-green-900' },
                    { title: 'Page Views', value: engagement.pageViews30d, icon: Eye, color: 'from-green-800 to-emerald-700' },
                    { title: 'New Customers', value: engagement.newCustomers30d, icon: UserPlus, color: 'from-teal-800 to-emerald-800' },
                    { title: 'Conversion Rate', value: `${engagement.conversionRate}%`, icon: TrendingUp, color: 'from-primary to-emerald-400', isText: true },
                  ].map(card => (
                    <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                      <Card className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className={`bg-gradient-to-r ${card.color} p-4 text-white`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white/80 text-sm">{card.title}</p>
                                <p className="text-2xl font-bold mt-1">
                                  {card.isText ? card.value : Number(card.value).toLocaleString()}
                                </p>
                              </div>
                              <card.icon className="size-8 text-white/40" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="font-serif flex items-center gap-2 text-lg">
                        <Eye className="size-5 text-primary" /> Daily Website Activity
                      </CardTitle>
                      <CardDescription>Page views and unique visitors — last 14 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        {engagementChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={engagementChartData}>
                              <defs>
                                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="oklch(0.55 0.13 155)" stopOpacity={0.35} />
                                  <stop offset="95%" stopColor="oklch(0.55 0.13 155)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="oklch(0.72 0.11 75)" stopOpacity={0.35} />
                                  <stop offset="95%" stopColor="oklch(0.72 0.11 75)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="day" className="text-xs" tick={{ fill: 'oklch(0.5 0.02 60)' }} />
                              <YAxis className="text-xs" tick={{ fill: 'oklch(0.5 0.02 60)' }} allowDecimals={false} />
                              <RechartsTooltip
                                contentStyle={{ backgroundColor: 'oklch(1 0 0)', border: '1px solid oklch(0.92 0.01 80)', borderRadius: '8px' }}
                              />
                              <Legend />
                              <Area type="monotone" dataKey="pageViews" name="Page Views" stroke="oklch(0.55 0.13 155)" fill="url(#viewsGradient)" strokeWidth={2} />
                              <Area type="monotone" dataKey="uniqueVisitors" name="Unique Visitors" stroke="oklch(0.72 0.11 75)" fill="url(#visitorsGradient)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            No engagement data yet — browse the site to start collecting activity.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="font-serif flex items-center gap-2 text-lg">
                        <BarChart3 className="size-5 text-primary" /> Engagement Funnel
                      </CardTitle>
                      <CardDescription>Customer journey (30 days)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {engagement.funnel.map((step, index) => {
                        const maxCount = engagement.funnel[0]?.count || 1
                        const width = Math.max(8, Math.round((step.count / maxCount) * 100))
                        return (
                          <div key={step.step}>
                            <div className="flex items-center justify-between text-sm mb-1.5">
                              <span className="font-medium">{step.step}</span>
                              <span className="text-muted-foreground">{step.count.toLocaleString()}</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${
                                  index === 0 ? 'from-emerald-700 to-green-800' :
                                  index === 1 ? 'from-green-700 to-emerald-600' :
                                  index === 2 ? 'from-teal-700 to-emerald-700' :
                                  'from-primary to-emerald-400'
                                }`}
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                      <Separator />
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-lg font-bold">{engagement.returningVisitors}</p>
                          <p className="text-[11px] text-muted-foreground">Returning Visitors</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-lg font-bold">{engagement.signUps30d}</p>
                          <p className="text-[11px] text-muted-foreground">New Sign-ups</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-lg font-bold">{engagement.addToCart30d}</p>
                          <p className="text-[11px] text-muted-foreground">Add to Cart</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-lg font-bold">{engagement.totalCustomers}</p>
                          <p className="text-[11px] text-muted-foreground">Total Customers</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {topPagesChartData.length > 0 && (
                  <Card className="mb-8">
                    <CardHeader>
                      <CardTitle className="font-serif flex items-center gap-2">
                        <Globe className="size-5 text-primary" /> Most Visited Pages
                      </CardTitle>
                      <CardDescription>Where customers spend their time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topPagesChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                            <XAxis type="number" tick={{ fill: 'oklch(0.5 0.02 60)' }} allowDecimals={false} />
                            <YAxis type="category" dataKey="page" width={100} tick={{ fill: 'oklch(0.5 0.02 60)', fontSize: 12 }} />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: 'oklch(1 0 0)', border: '1px solid oklch(0.92 0.01 80)', borderRadius: '8px' }}
                            />
                            <Bar dataKey="views" name="Views" fill="oklch(0.55 0.13 155)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Payment Status Overview */}
            {stats?.paymentStats && stats.paymentStats.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <Receipt className="size-5 text-primary" /> Payment Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.paymentStats.map(ps => (
                      <div key={ps.status} className="flex items-center gap-3 p-3 rounded-xl border">
                        <Badge className={`${paymentStatusColors[ps.status] || ''} text-xs px-2 py-1`} variant="secondary">
                          {ps.status}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{ps.count}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(ps.total, selectedCountry)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Method Breakdown */}
            {stats?.paymentMethodStats && stats.paymentMethodStats.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <CircleDollarSign className="size-5 text-primary" /> Payment Methods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.paymentMethodStats.map(pms => (
                      <div key={pms.method} className="p-4 rounded-xl border flex flex-col items-center text-center">
                        <span className="text-2xl mb-2">{paymentMethodLabels[pms.method]?.split(' ')[0] || '💳'}</span>
                        <p className="font-medium text-sm">{paymentMethodLabels[pms.method]?.split(' ').slice(1).join(' ') || pms.method}</p>
                        <p className="text-2xl font-bold mt-1">{pms.count}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(pms.total, selectedCountry)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Revenue Chart */}
            {chartData.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <TrendingUp className="size-5 text-primary" /> Revenue Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="oklch(0.55 0.13 155)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="oklch(0.55 0.13 155)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" tick={{ fill: 'oklch(0.5 0.02 60)' }} />
                        <YAxis className="text-xs" tick={{ fill: 'oklch(0.5 0.02 60)' }} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'oklch(1 0 0)', border: '1px solid oklch(0.92 0.01 80)', borderRadius: '8px' }}
                          formatter={(value: number) => [formatPrice(value, selectedCountry), 'Revenue']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="oklch(0.55 0.13 155)" fill="url(#goldGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Orders */}
            {stats?.recentOrders && stats.recentOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.recentOrders.map(order => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">{order.id.slice(0, 10)}</TableCell>
                            <TableCell>{order.customerName}</TableCell>
                            <TableCell>{formatPrice(order.total, selectedCountry)}</TableCell>
                            <TableCell>
                              <Badge className={`${paymentStatusColors[order.paymentStatus] || ''} text-[10px]`} variant="secondary">
                                {order.paymentStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[order.status] || ''} variant="secondary">
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}

// ─── Admin Products View ─────────────────────────────────────────────────────

interface CategoryOption {
  id: string
  name: string
  slug: string
  _count?: { products: number }
}

function AdminProducts({ products: initialProducts, onProductsChange }: { products: Product[]; onProductsChange?: () => void }) {
  const { selectedCountry } = useAppStore()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const canAdd = isSuperAdmin(user?.adminRole) || hasPermission(user?.permissions, 'products', 'add')
  const canEdit = isSuperAdmin(user?.adminRole) || hasPermission(user?.permissions, 'products', 'edit')
  const canDelete = isSuperAdmin(user?.adminRole) || hasPermission(user?.permissions, 'products', 'delete')
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formImage, setFormImage] = useState('')
  const [formImages, setFormImages] = useState<string[]>([])
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formStock, setFormStock] = useState('100')
  const [formFeatured, setFormFeatured] = useState(false)
  const [formStatus, setFormStatus] = useState('active')
  const [formError, setFormError] = useState('')
  const [uploading, setUploading] = useState(false)

  // Fetch categories on mount
  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCategories(data) })
      .catch(() => {})
  }, [])

  // Sync products when parent updates
  useEffect(() => {
    setProducts(initialProducts)
  }, [initialProducts])

  const refreshProducts = async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      if (Array.isArray(data)) setProducts(data)
      onProductsChange?.()
    } catch {}
  }

  const filtered = useMemo(() => {
    let result = products
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }
    if (catFilter !== 'all') {
      result = result.filter(p => p.category.slug === catFilter)
    }
    return result
  }, [products, search, catFilter])

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormPrice('')
    setFormImage('')
    setFormImages([])
    setFormCategoryId('')
    setFormStock('100')
    setFormFeatured(false)
    setFormStatus('active')
    setFormError('')
  }

  const openAddDialog = () => {
    resetForm()
    if (categories.length > 0 && !formCategoryId) {
      setFormCategoryId(categories[0].id)
    }
    setShowAddDialog(true)
  }

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product)
    setFormName(product.name)
    setFormDescription(product.description || '')
    setFormPrice(product.price.toString())
    setFormImage(product.image || '')
    setFormImages(Array.isArray(product.images) ? product.images : [])
    setFormCategoryId(product.categoryId)
    setFormStock(product.stock.toString())
    setFormFeatured(product.featured)
    setFormStatus(product.status)
    setFormError('')
    setShowEditDialog(true)
  }

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product)
    setShowDeleteDialog(true)
  }

  const openViewDialog = (product: Product) => {
    setSelectedProduct(product)
    setShowViewDialog(true)
  }

  // Image upload handler
  const handleImageUpload = async (files: FileList, isPrimary: boolean = false) => {
    setUploading(true)
    const uploadedUrls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', description: `${file.name} exceeds 5MB limit.`, variant: 'destructive' })
        continue
      }
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const data = await res.json()
          uploadedUrls.push(data.url)
        } else {
          const data = await res.json()
          toast({ title: 'Upload failed', description: data.error || 'Failed to upload image', variant: 'destructive' })
        }
      } catch {
        toast({ title: 'Upload failed', description: 'Network error', variant: 'destructive' })
      }
    }
    if (uploadedUrls.length > 0) {
      if (isPrimary) {
        setFormImage(uploadedUrls[0])
        // Also add to additional images if not already there
        setFormImages(prev => {
          const newImgs = [...prev]
          uploadedUrls.forEach(url => { if (!newImgs.includes(url)) newImgs.push(url) })
          return newImgs
        })
      } else {
        setFormImages(prev => {
          const newImgs = [...prev]
          uploadedUrls.forEach(url => { if (!newImgs.includes(url)) newImgs.push(url) })
          return newImgs
        })
      }
      toast({ title: 'Images uploaded', description: `${uploadedUrls.length} image(s) uploaded successfully.` })
    }
    setUploading(false)
  }

  const removeFormImage = (index: number) => {
    setFormImages(prev => prev.filter((_, i) => i !== index))
  }

  const setPrimaryFromImages = (url: string) => {
    setFormImage(url)
  }

  const handleAddProduct = async () => {
    setFormError('')
    if (!formName || !formPrice || !formCategoryId) {
      setFormError('Name, price, and category are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          price: formPrice,
          image: formImage,
          images: formImages,
          categoryId: formCategoryId,
          stock: formStock,
          featured: formFeatured,
          status: formStatus,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Product created', description: `${formName} has been added successfully.` })
        setShowAddDialog(false)
        resetForm()
        await refreshProducts()
        emitProductChange('created', data.id)
      } else {
        setFormError(data.error || 'Failed to create product')
      }
    } catch {
      setFormError('Something went wrong')
    }
    setSaving(false)
  }

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return
    setFormError('')
    if (!formName || !formPrice || !formCategoryId) {
      setFormError('Name, price, and category are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          price: formPrice,
          image: formImage,
          images: formImages,
          categoryId: formCategoryId,
          stock: formStock,
          featured: formFeatured,
          status: formStatus,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Product updated', description: `${formName} has been updated successfully.` })
        setShowEditDialog(false)
        resetForm()
        setSelectedProduct(null)
        await refreshProducts()
        emitProductChange('updated', selectedProduct.id)
      } else {
        setFormError(data.error || 'Failed to update product')
      }
    } catch {
      setFormError('Something went wrong')
    }
    setSaving(false)
  }

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return
    const deletedId = selectedProduct.id
    const deletedName = selectedProduct.name
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${deletedId}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Product deleted', description: `${deletedName} has been removed.`, variant: 'destructive' })
        setShowDeleteDialog(false)
        setSelectedProduct(null)
        await refreshProducts()
        emitProductChange('deleted', deletedId)
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to delete product', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    }
    setSaving(false)
  }

  const toggleProductStatus = async (product: Product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast({ title: `Product ${newStatus}`, description: `${product.name} is now ${newStatus}.` })
        await refreshProducts()
        emitProductChange('updated', product.id)
      }
    } catch {}
  }

  const toggleFeatured = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !product.featured }),
      })
      if (res.ok) {
        toast({ title: product.featured ? 'Unfeatured' : 'Featured', description: `${product.name} ${product.featured ? 'removed from' : 'added to'} featured.` })
        await refreshProducts()
        emitProductChange('updated', product.id)
      }
    } catch {}
  }

  // Product Form Component (shared for Add & Edit)
  const ProductForm = () => (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
      {formError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {formError}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="form-name">Product Name *</Label>
        <Input id="form-name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Argan Oil" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="form-desc">Description</Label>
        <Textarea id="form-desc" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Product description..." rows={5} className="resize-y min-h-[120px]" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="form-price">Price (SAR) *</Label>
          <Input id="form-price" type="number" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="form-stock">Stock</Label>
          <Input id="form-stock" type="number" value={formStock} onChange={e => setFormStock(e.target.value)} placeholder="100" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="form-category">Category *</Label>
        <Select value={formCategoryId} onValueChange={setFormCategoryId}>
          <SelectTrigger id="form-category"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Primary Image Upload */}
      <div className="space-y-3">
        <Label>Primary Image</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ImagePlus className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={formImage} onChange={e => setFormImage(e.target.value)} placeholder="Enter image URL..." className="pl-9" />
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { if (e.target.files?.length) handleImageUpload(e.target.files, true) }}
            />
            <Button variant="outline" size="icon" className="size-10" disabled={uploading} asChild>
              <span><Upload className="size-4" /></span>
            </Button>
          </label>
        </div>
        {formImage && (
          <div className="relative inline-block">
            <div className="size-24 rounded-lg border overflow-hidden">
              <img src={formImage} alt="Primary preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <Badge className="absolute -top-2 -left-2 text-[9px] px-1.5 py-0" variant="default">Primary</Badge>
            <button
              onClick={() => setFormImage('')}
              className="absolute -top-2 -right-2 size-5 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/80 transition-colors"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* Additional Images Upload */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Additional Images ({formImages.length})</Label>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files?.length) handleImageUpload(e.target.files, false) }}
            />
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" disabled={uploading} asChild>
              <span>
                {uploading ? (
                  <div className="size-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="size-3" />
                )}
                {uploading ? 'Uploading...' : 'Upload Images'}
              </span>
            </Button>
          </label>
        </div>
        {formImages.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {formImages.map((img, idx) => (
              <div key={idx} className="relative group aspect-square rounded-lg border overflow-hidden bg-muted">
                <img src={img} alt={`Product image ${idx + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-6 rounded-full"
                    onClick={() => setPrimaryFromImages(img)}
                    title="Set as primary"
                  >
                    <Star className="size-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="size-6 rounded-full"
                    onClick={() => removeFormImage(idx)}
                    title="Remove"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
                {img === formImage && (
                  <Badge className="absolute top-1 left-1 text-[8px] px-1 py-0">Primary</Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <ImageIcon className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No additional images yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click &quot;Upload Images&quot; or drag and drop</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="form-status">Status</Label>
        <Select value={formStatus} onValueChange={setFormStatus}>
          <SelectTrigger id="form-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="form-featured" checked={formFeatured} onCheckedChange={(checked) => setFormFeatured(checked as boolean)} />
        <Label htmlFor="form-featured" className="cursor-pointer">Featured product</Label>
      </div>
    </div>
  )

  // Get all images for a product (primary + additional)
  const getProductImages = (p: Product): string[] => {
    const imgs: string[] = []
    if (p.image) imgs.push(p.image)
    if (Array.isArray(p.images)) {
      p.images.forEach((img: string) => { if (img && !imgs.includes(img)) imgs.push(img) })
    }
    return imgs
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">Manage Products</h1>
            <p className="text-muted-foreground">{products.length} total products</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => useAppStore.getState().setView({ view: 'admin' })}>
              <ArrowLeft className="size-4 mr-1" /> Dashboard
            </Button>
            {canAdd && (
              <Button onClick={openAddDialog}>
                <Plus className="size-4 mr-1" /> Add Product
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.slug}>{c.name} ({c._count?.products ?? 0})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refreshProducts} title="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Images</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        {search || catFilter !== 'all' ? 'No products match your filters' : 'No products yet. Add your first product!'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(p => {
                      const allImgs = getProductImages(p)
                      return (
                        <TableRow key={p.id} className="group">
                          <TableCell>
                            <div className="size-10 rounded-md overflow-hidden bg-gradient-to-br from-primary/10 to-emerald-500/10 shrink-0">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-[8px] font-bold text-primary/40">{getProductInitials(p.name)}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <button onClick={() => openViewDialog(p)} className="font-medium text-sm hover:text-primary transition-colors text-left max-w-[200px] truncate block">
                              {p.name}
                            </button>
                            {p.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</p>
                            )}
                          </TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs">{p.category.name}</Badge></TableCell>
                          <TableCell className="font-semibold">{formatPrice(p.price, selectedCountry)}</TableCell>
                          <TableCell>
                            <span className={`text-sm ${p.stock < 10 ? 'text-destructive font-semibold' : p.stock < 30 ? 'text-gold font-medium' : ''}`}>
                              {p.stock}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex -space-x-1">
                              {allImgs.slice(0, 3).map((img, idx) => (
                                <div key={idx} className="size-6 rounded border-2 border-background overflow-hidden">
                                  <img src={img} alt="" className="w-full h-full object-cover" />
                                </div>
                              ))}
                              {allImgs.length > 3 && (
                                <div className="size-6 rounded border-2 border-background bg-muted flex items-center justify-center">
                                  <span className="text-[8px] font-medium text-muted-foreground">+{allImgs.length - 3}</span>
                                </div>
                              )}
                              {allImgs.length === 0 && (
                                <span className="text-xs text-muted-foreground">0</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <button onClick={() => toggleProductStatus(p)} className="focus:outline-none" title={`Click to ${p.status === 'active' ? 'deactivate' : 'activate'}`}>
                              <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-xs cursor-pointer hover:opacity-80 transition-opacity">
                                {p.status}
                              </Badge>
                            </button>
                          </TableCell>
                          <TableCell>
                            <button onClick={() => toggleFeatured(p)} className="focus:outline-none" title={`Click to ${p.featured ? 'unfeature' : 'feature'}`}>
                              {p.featured ? (
                                <Star className="size-4 text-gold fill-gold" />
                              ) : (
                                <Star className="size-4 text-muted-foreground/40" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="size-8" onClick={() => openViewDialog(p)} title="View">
                                <Eye className="size-3.5" />
                              </Button>
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(p)} title="Edit">
                                  <Pencil className="size-3.5" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(p)} title="Delete">
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add Product Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl flex items-center gap-2">
                <Plus className="size-5 text-primary" /> Add New Product
              </DialogTitle>
              <DialogDescription>Create a new product for your store. Upload images or provide URLs.</DialogDescription>
            </DialogHeader>
            <ProductForm />
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddProduct} disabled={saving || uploading}>
                {saving ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus className="size-4 mr-1" /> Add Product</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl flex items-center gap-2">
                <Pencil className="size-5 text-primary" /> Edit Product
              </DialogTitle>
              <DialogDescription>Update product details and images.</DialogDescription>
            </DialogHeader>
            <ProductForm />
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm() }}>Cancel</Button>
              <Button onClick={handleUpdateProduct} disabled={saving || uploading}>
                {saving ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="size-4 mr-1" /> Save Changes</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Product Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl flex items-center gap-2 text-destructive">
                <Trash2 className="size-5" /> Delete Product
              </DialogTitle>
              <DialogDescription>This action cannot be undone.</DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <div className="py-4">
                <div className="flex items-center gap-4 p-4 rounded-lg border bg-destructive/5">
                  <div className="size-14 rounded-md overflow-hidden bg-gradient-to-br from-primary/10 to-emerald-500/10 shrink-0">
                    {selectedProduct.image ? (
                      <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="size-6 text-primary/40" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedProduct.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedProduct.category.name} • {formatPrice(selectedProduct.price, selectedCountry)}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">Are you sure you want to delete <strong>{selectedProduct.name}</strong>? All associated order items will also be removed.</p>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteProduct} disabled={saving}>
                {saving ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Trash2 className="size-4 mr-1" /> Delete</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Product Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl flex items-center gap-2">
                <Eye className="size-5 text-primary" /> Product Details
              </DialogTitle>
              <DialogDescription>Full product information.</DialogDescription>
            </DialogHeader>
            {selectedProduct && (() => {
              const viewImages = getProductImages(selectedProduct)
              return (
                <div className="space-y-4">
                  {/* Image Gallery */}
                  {viewImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {viewImages.map((img, idx) => (
                        <div key={idx} className="shrink-0 size-20 rounded-lg overflow-hidden border bg-muted">
                          <img src={img} alt={`${selectedProduct.name} ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4">
                    <div className="size-28 rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-emerald-500/10 shrink-0">
                      {selectedProduct.image ? (
                        <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getGradientForCategory(selectedProduct.category.slug)} flex items-center justify-center`}>
                          <span className="text-2xl font-bold text-white/30 font-serif">{getProductInitials(selectedProduct.name)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-bold text-lg">{selectedProduct.name}</h3>
                      <Badge variant="secondary" className="text-xs mt-1">{selectedProduct.category.name}</Badge>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={selectedProduct.status === 'active' ? 'default' : 'secondary'} className="text-xs">{selectedProduct.status}</Badge>
                        {selectedProduct.featured && (
                          <Badge className="text-xs bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary border-0">
                            <Star className="size-3 mr-1 fill-gold text-gold" /> Featured
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{viewImages.length} image{viewImages.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {selectedProduct.description && (
                    <div>
                      <p className="text-sm font-medium mb-1">Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedProduct.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="font-bold text-primary">{formatPrice(selectedProduct.price, selectedCountry)}</p>
                        <p className="text-[10px] text-muted-foreground">{selectedProduct.price} SAR</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Stock</p>
                        <p className={`font-bold ${selectedProduct.stock < 10 ? 'text-destructive' : selectedProduct.stock < 30 ? 'text-gold' : 'text-primary'}`}>
                          {selectedProduct.stock} units
                        </p>
                        <p className="text-[10px] text-muted-foreground">{selectedProduct.stock < 10 ? 'Low stock!' : 'In stock'}</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Slug: <span className="font-mono">{selectedProduct.slug}</span></p>
                    <p>ID: <span className="font-mono">{selectedProduct.id}</span></p>
                    <p>Created: {new Date(selectedProduct.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )
            })()}
            <DialogFooter className="gap-2">
              {canEdit && (
                <Button variant="outline" onClick={() => { setShowViewDialog(false); if (selectedProduct) openEditDialog(selectedProduct) }}>
                  <Pencil className="size-4 mr-1" /> Edit
                </Button>
              )}
              <Button onClick={() => setShowViewDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}

// ─── Admin Orders View ───────────────────────────────────────────────────────

function AdminOrders() {
  const { selectedCountry } = useAppStore()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const canEdit = isSuperAdmin(user?.adminRole) || hasPermission(user?.permissions, 'orders', 'edit')
  const canDelete = isSuperAdmin(user?.adminRole) || hasPermission(user?.permissions, 'orders', 'delete')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  const refreshOrders = useCallback(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => { setOrders(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { refreshOrders() }, [refreshOrders])

  const filtered = useMemo(() => {
    let result = orders
    if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter)
    if (paymentFilter !== 'all') result = result.filter(o => o.paymentStatus === paymentFilter)
    return result
  }, [orders, statusFilter, paymentFilter])

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      })
      if (res.ok) {
        toast({ title: 'Order updated', description: `Status changed to ${status}.` })
        refreshOrders()
      }
    } catch {}
  }

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentStatus }),
      })
      if (res.ok) {
        toast({ title: 'Payment updated', description: `Payment status changed to ${paymentStatus}.` })
        refreshOrders()
      }
    } catch {}
  }

  const handleRefund = async (orderId: string) => {
    try {
      const res = await fetch('/api/payment/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Refund processed', description: data.message })
        refreshOrders()
      } else {
        toast({ title: 'Refund failed', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to process refund', variant: 'destructive' })
    }
  }

  const statusColors = royalOrderStatusColors

  const paymentStatusColors = royalPaymentStatusColors

  const paymentMethodLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    card: { label: 'Credit Card', icon: <CreditCard className="size-3.5" /> },
    mada: { label: 'Mada', icon: <Banknote className="size-3.5" /> },
    applepay: { label: 'Apple Pay', icon: <Smartphone className="size-3.5" /> },
    cod: { label: 'COD', icon: <Wallet className="size-3.5" /> },
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">Manage Orders</h1>
            <p className="text-muted-foreground">{orders.length} total orders</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshOrders}>
              <RefreshCw className="size-4 mr-1" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => useAppStore.getState().setView({ view: 'admin' })}>
              <ArrowLeft className="size-4 mr-1" /> Dashboard
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Order status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Order Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Payment status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment Statuses</SelectItem>
              <SelectItem value="pending">💰 Pending</SelectItem>
              <SelectItem value="paid">✅ Paid</SelectItem>
              <SelectItem value="failed">❌ Failed</SelectItem>
              <SelectItem value="refunded">🔄 Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {loading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading orders...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No orders found.</CardContent></Card>
          ) : (
            filtered.map(order => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Order Header - Always Visible */}
                  <button
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-xs bg-secondary px-2 py-1 rounded">{order.id.slice(0, 10)}</span>
                        <Badge className={statusColors[order.status] || ''} variant="secondary">{order.status}</Badge>
                        <Badge className={`${paymentStatusColors[order.paymentStatus] || ''} text-[10px]`} variant="secondary">
                          {order.paymentStatus}
                        </Badge>
                        {order.paymentMethod && paymentMethodLabels[order.paymentMethod] && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {paymentMethodLabels[order.paymentMethod].icon}
                            {paymentMethodLabels[order.paymentMethod].label}
                          </span>
                        )}
                        {order.couponCode && (
                          <Badge variant="secondary" className="text-[10px] bg-gold/15 text-gold border-gold/25">
                            <Tag className="size-3 mr-1" /> {order.couponCode}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="font-medium">{order.customerName}</span>
                        <span className="text-muted-foreground">{order.customerEmail}</span>
                        <span className="text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg">{formatPrice(order.total, selectedCountry)}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} item(s)</p>
                    </div>
                    <ChevronDown className={`size-5 text-muted-foreground transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedOrder === order.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t p-4 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Payment Details */}
                            <div className="p-3 rounded-lg border bg-secondary/30">
                              <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <Receipt className="size-4 text-primary" /> Payment Details
                              </p>
                              <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Method</span>
                                  <span className="flex items-center gap-1">
                                    {order.paymentMethod && paymentMethodLabels[order.paymentMethod]?.icon}
                                    {order.paymentMethod || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Status</span>
                                  <Badge className={`${paymentStatusColors[order.paymentStatus] || ''} text-[10px]`} variant="secondary">
                                    {order.paymentStatus}
                                  </Badge>
                                </div>
                                {order.couponCode && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Coupon</span>
                                    <span className="text-primary font-medium">
                                      {order.couponCode} (-{formatPrice(order.discountAmount || 0, selectedCountry)})
                                    </span>
                                  </div>
                                )}
                                {order.transactionId && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Transaction</span>
                                    <span className="font-mono text-xs">{order.transactionId}</span>
                                  </div>
                                )}
                                {order.cardLast4 && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Card</span>
                                    <span className="font-mono text-xs">•••• {order.cardLast4}</span>
                                  </div>
                                )}
                                {order.paidAt && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Paid At</span>
                                    <span className="text-xs">{new Date(order.paidAt).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className="p-3 rounded-lg border bg-secondary/30 sm:col-span-2">
                              <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <Package className="size-4 text-primary" /> Items
                              </p>
                              <div className="space-y-1.5">
                                {order.items.map(item => (
                                  <div key={item.id} className="flex justify-between text-sm">
                                    <span className="truncate mr-2">{item.name} x{item.quantity}</span>
                                    <span className="shrink-0">{formatPrice(item.price * item.quantity, selectedCountry)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          {canEdit ? (
                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                              {/* Order Status Actions */}
                              <span className="text-xs text-muted-foreground self-center mr-2">Order:</span>
                              {['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                                <Button
                                  key={s}
                                  variant={order.status === s ? 'default' : 'outline'}
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => updateOrderStatus(order.id, s)}
                                  disabled={order.status === s}
                                >
                                  {s}
                                </Button>
                              ))}

                              <Separator orientation="vertical" className="h-7 mx-2" />

                              {/* Payment Status Actions */}
                              <span className="text-xs text-muted-foreground self-center mr-2">Payment:</span>
                              {order.paymentStatus !== 'paid' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-primary hover:text-primary/80"
                                  onClick={() => updatePaymentStatus(order.id, 'paid')}
                                >
                                  <Check className="size-3 mr-1" /> Mark Paid
                                </Button>
                              )}
                              {order.paymentStatus === 'paid' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-primary hover:text-primary/80"
                                  onClick={() => handleRefund(order.id)}
                                >
                                  <RotateCcw className="size-3 mr-1" /> Refund
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground">You don&apos;t have permission to modify orders.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Sign In View ─────────────────────────────────────────────────────────────

function SignInView() {
  const { setView } = useAppStore()
  const { signIn } = useAuthStore()
  const { toast } = useToast()
  const [loginType, setLoginType] = useState<'customer' | 'admin'>('customer')
  const [customerAuthMethod, setCustomerAuthMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (loginType === 'admin') {
      if (!email || !password) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }
    } else if (customerAuthMethod === 'email') {
      if (!email || !password) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }
    } else {
      if (!phone || !password) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }
    }

    const result = loginType === 'admin' || customerAuthMethod === 'email'
      ? await signIn(email, password, 'email')
      : await signIn(phone, password, 'phone')
    setLoading(false)

    if (result.success) {
      const signedInUser = useAuthStore.getState().user
      const isAdmin = signedInUser?.role === 'admin'
      toast({
        title: isAdmin ? 'Welcome, Admin!' : 'Welcome back!',
        description: isAdmin ? 'You have been signed in to the admin dashboard.' : 'You have been signed in successfully.',
      })
      setView({ view: isAdmin ? 'admin' : 'home' })
    } else {
      setError(result.error || 'Invalid credentials')
    }
  }

  const switchToAdmin = () => {
    setLoginType('admin')
    setCustomerAuthMethod('email')
    setEmail('admin@alifaain.com')
    setPhone('')
    setPassword('')
    setError('')
  }

  const switchToCustomer = () => {
    setLoginType('customer')
    setCustomerAuthMethod('email')
    setEmail('')
    setPhone('')
    setPassword('')
    setError('')
  }

  // Dynamic left panel colors based on login type
  const leftGradient = loginType === 'admin'
    ? 'from-slate-800 via-slate-700 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950'
    : 'from-emerald-950 via-green-800 to-teal-900'
  const mobileGradient = loginType === 'admin'
    ? 'from-slate-800 via-slate-700 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950'
    : 'from-emerald-950 via-green-800 to-teal-900'

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8 sm:py-12">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-stretch gap-0 lg:gap-0 overflow-hidden rounded-2xl">
        {/* Left Side - Decorative */}
        <motion.div
          key={loginType}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className={`hidden lg:flex lg:w-5/12 relative bg-gradient-to-br ${leftGradient} rounded-l-2xl overflow-hidden items-center justify-center p-10`}
        >
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute top-8 left-8 size-20 bg-white/10 rounded-full blur-xl animate-float" />
          <div className="absolute bottom-12 right-8 size-32 bg-white/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/3 right-12 size-14 bg-white/10 rounded-full blur-lg animate-float" style={{ animationDelay: '0.8s' }} />

          <div className="relative z-10 text-white text-center">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-8"
            >
              {loginType === 'admin' ? (
                <div className="size-24 rounded-2xl mx-auto bg-white/15 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/20 shadow-2xl">
                  <ShieldCheck className="size-12 text-white" />
                </div>
              ) : (
                <img src="/alifaain-logo.jpg" alt="Alifaain" className="size-24 rounded-full mx-auto ring-4 ring-white/30 shadow-2xl object-cover" />
              )}
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.div
                key={loginType}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="font-serif text-3xl font-bold mb-3">
                  {loginType === 'admin' ? 'Admin Portal' : 'Welcome Back'}
                </h2>
                <p className="text-white/80 text-sm leading-relaxed max-w-[260px] mx-auto">
                  {loginType === 'admin'
                    ? 'Secure access to your dashboard. Manage products, orders, and more.'
                    : 'Sign in to your Alifaain account and explore our premium beauty collections.'}
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-8 flex items-center justify-center gap-4">
              {loginType === 'admin' ? (
                <div className="flex items-center gap-2 text-white/60 text-xs">
                  <Lock className="size-4" />
                  <span>Secured admin access</span>
                </div>
              ) : (
                <>
                  <div className="flex -space-x-2">
                    {['🇲🇦', '🇰🇷', '💊'].map((emoji, i) => (
                      <div key={i} className="size-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm ring-2 ring-white/30">
                        {emoji}
                      </div>
                    ))}
                  </div>
                  <span className="text-white/70 text-xs">Trusted by thousands</span>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right Side - Form */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full lg:w-7/12"
        >
          <div className="gradient-border rounded-2xl lg:rounded-l-none">
            <Card className="border-0 shadow-xl">
              {/* Mobile Header */}
              <div className={`lg:hidden relative bg-gradient-to-r ${mobileGradient} p-6 rounded-t-xl`}>
                <div className="absolute inset-0 bg-black/10 rounded-t-xl" />
                <div className="relative z-10 flex items-center gap-4">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {loginType === 'admin' ? (
                      <div className="size-14 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30 shadow-lg">
                        <ShieldCheck className="size-7 text-white" />
                      </div>
                    ) : (
                      <img src="/alifaain-logo.jpg" alt="Alifaain" className="size-14 rounded-full ring-2 ring-white/30 shadow-lg object-cover" />
                    )}
                  </motion.div>
                  <div className="text-white">
                    <h2 className="font-serif text-2xl font-bold">{loginType === 'admin' ? 'Admin Portal' : 'Welcome Back'}</h2>
                    <p className="text-white/80 text-sm">{loginType === 'admin' ? 'Sign in to admin dashboard' : 'Sign in to your Alifaain account'}</p>
                  </div>
                </div>
              </div>

              <CardHeader className="text-center pb-0 hidden lg:block">
                <div className={`mx-auto mb-4 size-14 rounded-full flex items-center justify-center ${loginType === 'admin' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-primary/10'}`}>
                  {loginType === 'admin' ? (
                    <ShieldCheck className="size-7 text-slate-600 dark:text-slate-300" />
                  ) : (
                    <LogIn className="size-7 text-primary" />
                  )}
                </div>
                <CardTitle className="font-serif text-2xl">
                  {loginType === 'admin' ? 'Admin Portal' : 'Welcome Back'}
                </CardTitle>
                <CardDescription>
                  {loginType === 'admin' ? 'Sign in to admin dashboard' : 'Sign in to your Alifaain account'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                      >
                        <AlertCircle className="size-4 shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {loginType === 'customer' && (
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-secondary/60">
                      <button
                        type="button"
                        onClick={() => { setCustomerAuthMethod('email'); setPhone(''); setError('') }}
                        className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          customerAuthMethod === 'email'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Mail className="size-4" />
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCustomerAuthMethod('phone'); setEmail(''); setError('') }}
                        className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          customerAuthMethod === 'phone'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Phone className="size-4" />
                        Mobile
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor={loginType === 'admin' || customerAuthMethod === 'email' ? 'email' : 'phone'}>
                      {loginType === 'admin'
                        ? 'Admin Email'
                        : customerAuthMethod === 'email'
                          ? 'Email Address'
                          : 'Mobile Number'}
                    </Label>
                    <div className="relative">
                      {loginType === 'admin' || customerAuthMethod === 'email' ? (
                        <>
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder={loginType === 'admin' ? 'admin@alifaain.com' : 'you@example.com'}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-9"
                            autoComplete="email"
                          />
                        </>
                      ) : (
                        <PhoneInput
                          id="phone"
                          value={phone}
                          onChange={setPhone}
                          autoComplete="tel"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={loginType === 'admin' ? 'Enter admin password' : 'Enter your password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-10"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {loginType === 'customer' && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      />
                      <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                        Remember me
                      </Label>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className={`w-full ${loginType === 'admin' ? 'bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600' : ''}`}
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {loginType === 'admin' ? (
                          <><ShieldCheck className="size-4 mr-2" /> Sign In as Admin</>
                        ) : (
                          <><LogIn className="size-4 mr-2" /> Sign In</>
                        )}
                      </>
                    )}
                  </Button>

                  {/* Admin demo credentials hint */}
                  {loginType === 'admin' && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-lg border border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 p-3"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="size-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-primary">Demo Credentials</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                            admin@alifaain.com / admin123
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Customer demo credentials hint */}
                  {loginType === 'customer' && customerAuthMethod === 'phone' && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-lg border border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 p-3"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="size-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-primary">Demo Mobile Login</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                            +966501234567 / customer123
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </form>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 border-t pt-6">
                {loginType === 'customer' ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setView({ view: 'signup' })}
                        className="text-primary font-semibold hover:underline"
                      >
                        Create one
                      </button>
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      Admin?{' '}
                      <button
                        type="button"
                        onClick={switchToAdmin}
                        className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                      >
                        <ShieldCheck className="size-3.5" />
                        Sign in to admin panel
                      </button>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground text-center">
                      Admin access is restricted to authorized personnel only.
                    </p>
                    <button
                      type="button"
                      onClick={switchToCustomer}
                      className="text-sm text-primary font-medium hover:underline"
                    >
                      ← Back to customer sign in
                    </button>
                  </>
                )}
              </CardFooter>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Sign Up View ─────────────────────────────────────────────────────────────

function SignUpView() {
  const { setView } = useAppStore()
  const { signUp } = useAuthStore()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Real-time validation
  const nameError = name.length > 0 && name.length < 2 ? 'Name must be at least 2 characters' : ''
  const emailError = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Please enter a valid email' : ''
  const phoneError = phone.length > 0 && !isValidPhone(phone) ? 'Please enter a valid mobile number' : ''

  // Password strength
  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (pwd.length === 0) return { label: '', color: '', width: '0%' }
    if (pwd.length < 6) return { label: 'Weak', color: 'bg-destructive', width: '33%' }
    if (pwd.length <= 8) return { label: 'Medium', color: 'bg-gold', width: '66%' }
    const hasMixed = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd)
    const hasNumbers = /\d/.test(pwd)
    if (hasMixed && hasNumbers) return { label: 'Strong', color: 'bg-primary', width: '100%' }
    return { label: 'Medium', color: 'bg-gold', width: '66%' }
  }

  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (name.length < 2) {
      setError('Name must be at least 2 characters')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (phone.trim() && phoneError) {
      setError('Please enter a valid mobile number')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!termsAccepted) {
      setError('You must accept the terms and conditions')
      return
    }

    setLoading(true)

    const result = await signUp(name, email, password, phone.trim() || undefined)
    setLoading(false)

    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        toast({ title: 'Account created!', description: 'Welcome to Alifaain!' })
        setView({ view: 'home' })
      }, 1500)
    } else {
      setError(result.error || 'Registration failed')
    }
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center px-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="size-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
          >
            <Check className="size-10 text-primary" />
          </motion.div>
          <h2 className="font-serif text-2xl font-bold mb-2">Account Created!</h2>
          <p className="text-muted-foreground mb-4">Welcome to Alifaain. Redirecting you now...</p>
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8 sm:py-12">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-stretch gap-0 lg:gap-0 overflow-hidden rounded-2xl">
        {/* Left Side - Decorative */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:flex lg:w-5/12 relative bg-gradient-to-br from-emerald-950 via-green-800 to-teal-900 rounded-l-2xl overflow-hidden items-center justify-center p-10"
        >
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute top-10 right-10 size-24 bg-white/10 rounded-full blur-xl animate-float" />
          <div className="absolute bottom-16 left-8 size-28 bg-white/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.2s' }} />
          <div className="absolute top-1/2 left-1/4 size-16 bg-white/10 rounded-full blur-lg animate-float" style={{ animationDelay: '0.5s' }} />

          <div className="relative z-10 text-white text-center">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-8"
            >
              <div className="size-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto ring-4 ring-white/30">
                <Sparkles className="size-10 text-white" />
              </div>
            </motion.div>
            <h2 className="font-serif text-3xl font-bold mb-3">Join Alifaain</h2>
            <p className="text-white/80 text-sm leading-relaxed max-w-[260px] mx-auto">
              Create an account to unlock exclusive offers and track your beauty journey.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
              {[
                { icon: <ShieldCheck className="size-4" />, text: 'Secure' },
                { icon: <Star className="size-4" />, text: 'Premium' },
                { icon: <Truck className="size-4" />, text: 'Fast Ship' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  {item.icon}
                  <span className="text-[10px] text-white/80">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Side - Form */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full lg:w-7/12"
        >
          <div className="gradient-border rounded-2xl lg:rounded-l-none">
            <Card className="border-0 shadow-xl">
              {/* Mobile Header */}
              <div className="lg:hidden relative bg-gradient-to-r from-emerald-950 via-green-800 to-teal-900 p-6 rounded-t-xl">
                <div className="absolute inset-0 bg-black/10 rounded-t-xl" />
                <div className="relative z-10 flex items-center gap-4">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="size-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
                      <Sparkles className="size-7 text-white" />
                    </div>
                  </motion.div>
                  <div className="text-white">
                    <h2 className="font-serif text-2xl font-bold">Create Account</h2>
                    <p className="text-white/80 text-sm">Join Alifaain for the best beauty experience</p>
                  </div>
                </div>
              </div>

              <CardHeader className="text-center pb-2 hidden lg:block">
                <div className="mx-auto mb-4 size-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserPlus className="size-7 text-primary" />
                </div>
                <CardTitle className="font-serif text-2xl">Create Account</CardTitle>
                <CardDescription>Join Alifaain for the best beauty experience</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                      >
                        <AlertCircle className="size-4 shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`pl-9 ${nameError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        autoComplete="name"
                      />
                    </div>
                    {nameError && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="size-3" /> {nameError}
                      </motion.p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`pl-9 ${emailError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        autoComplete="email"
                      />
                    </div>
                    {emailError && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="size-3" /> {emailError}
                      </motion.p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Mobile Number <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <PhoneInput
                      id="signup-phone"
                      value={phone}
                      onChange={setPhone}
                      error={!!phoneError}
                      autoComplete="tel"
                    />
                    {phoneError ? (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="size-3" /> {phoneError}
                      </motion.p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Add your mobile number to sign in with phone later</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {password.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: passwordStrength.width }}
                            className={`h-full rounded-full ${passwordStrength.color}`}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className={`text-xs font-medium ${
                          passwordStrength.label === 'Weak' ? 'text-destructive' :
                          passwordStrength.label === 'Medium' ? 'text-gold' : 'text-primary'
                        }`}>
                          {passwordStrength.label}
                        </p>
                      </motion.div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`pl-9 pr-10 ${passwordsMismatch ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {passwordsMatch && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-xs text-primary">
                        <Check className="size-3" /> Passwords match
                      </motion.p>
                    )}
                    {passwordsMismatch && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="size-3" /> Passwords do not match
                      </motion.p>
                    )}
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-snug">
                      I agree to the{' '}
                      <span className="text-primary font-medium hover:underline cursor-pointer">Terms of Service</span>
                      {' '}and{' '}
                      <span className="text-primary font-medium hover:underline cursor-pointer">Privacy Policy</span>
                    </Label>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? (
                      <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="size-4 mr-2" /> Create Account
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="justify-center border-t pt-6">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    onClick={() => setView({ view: 'signin' })}
                    className="text-primary font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </CardFooter>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Profile View ─────────────────────────────────────────────────────────────

function ProfileView() {
  const { user, signOut } = useAuthStore()
  const { setView, selectedCountry } = useAppStore()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('details')
  const [profileLoading, setProfileLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [orderCount, setOrderCount] = useState(0)
  const [editName, setEditName] = useState(() => user?.name || '')
  const [editEmail, setEditEmail] = useState(() => user?.email || '')
  const [editPhone, setEditPhone] = useState(() => user?.phone || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Fetch profile data
  useEffect(() => {
    if (user) {
      Promise.all([
        fetch('/api/auth/profile').then(r => r.json()).catch(() => null),
        fetch('/api/user/orders').then(r => r.json()).catch(() => []),
      ]).then(([profileData, ordersData]) => {
        if (profileData?.user) {
          if (profileData.user._count?.orders !== undefined) {
            setOrderCount(profileData.user._count.orders)
          }
          setEditPhone(profileData.user.phone || '')
        }
        if (ordersData?.orders && Array.isArray(ordersData.orders)) {
          setOrders(ordersData.orders)
        } else if (Array.isArray(ordersData)) {
          setOrders(ordersData)
        }
        setProfileLoading(false)
      })
    }
  }, [user])

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <motion.div {...fadeIn}>
          <UserCircle className="size-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2">Not Signed In</h2>
          <p className="text-muted-foreground mb-6">Please sign in to view your profile.</p>
          <Button onClick={() => setView({ view: 'signin' })}>
            <LogIn className="size-4 mr-2" /> Sign In
          </Button>
        </motion.div>
      </div>
    )
  }

  const handleSignOut = async () => {
    await signOut()
    toast({ title: 'Signed out', description: 'You have been signed out successfully.' })
    setView({ view: 'home' })
  }

  const handleSaveProfile = async () => {
    if (editPhone.trim() && !isValidPhone(editPhone)) {
      toast({ title: 'Error', description: 'Please enter a valid mobile number', variant: 'destructive' })
      return
    }

    setSavingProfile(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone.trim() || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Profile updated', description: 'Your profile has been updated successfully.' })
        if (data.user && user) {
          useAuthStore.getState().setUser({ ...user, ...data.user })
        }
        await useAuthStore.getState().fetchSession()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update profile', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' })
    }
    setSavingProfile(false)
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' })
      return
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' })
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Password changed', description: 'Your password has been changed successfully.' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to change password', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to change password', variant: 'destructive' })
    }
    setSavingPassword(false)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        {/* Profile Header */}
        <div className="gradient-border rounded-2xl overflow-hidden mb-6">
          <Card className="border-0">
            <CardContent className="p-0">
              <div className="relative bg-gradient-to-br from-primary/10 via-emerald-500/5 to-green-500/10 p-6 sm:p-8">
                <div className="absolute top-4 right-4">
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
                    <LogOut className="size-4" /> Sign Out
                  </Button>
                </div>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="size-16 sm:size-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-4 ring-background shadow-lg shrink-0">
                    {user.image ? (
                      <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl sm:text-2xl font-bold text-primary font-serif">{user.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold truncate">{user.name}</h2>
                    <p className="text-muted-foreground text-sm truncate">{user.email}</p>
                    {(editPhone || user.phone) && (
                      <p className="text-muted-foreground text-sm truncate flex items-center gap-1.5 mt-0.5">
                        <Phone className="size-3.5 shrink-0" />
                        {editPhone || user.phone}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {user.role === 'admin' ? (
                          <><ShieldCheck className="size-3 mr-1" /> Administrator</>
                        ) : (
                          <><UserCircle className="size-3 mr-1" /> Customer</>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Stats */}
              <div className="grid grid-cols-3 divide-x border-t">
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Package className="size-4 text-primary" />
                    <span className="text-xl sm:text-2xl font-bold">{profileLoading ? <span className="shimmer inline-block w-8 h-6 rounded" /> : orderCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Calendar className="size-4 text-primary" />
                    <span className="text-sm font-semibold">{formatDate(user.createdAt || new Date().toISOString())}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Member Since</p>
                </div>
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <ShieldCheck className="size-4 text-primary" />
                    <span className="text-sm font-semibold capitalize">{user.role}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Account Type</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
            <TabsTrigger value="password" className="text-xs sm:text-sm">Password</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm">Orders</TabsTrigger>
            <TabsTrigger value="danger" className="text-xs sm:text-sm text-destructive">Danger</TabsTrigger>
          </TabsList>

          {/* Account Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg flex items-center gap-2">
                  <UserCircle className="size-5 text-primary" /> Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Mobile Number</Label>
                  <PhoneInput
                    id="edit-phone"
                    value={editPhone}
                    onChange={setEditPhone}
                    autoComplete="tel"
                  />
                  <p className="text-xs text-muted-foreground">
                    {editPhone ? 'Used for mobile sign-in and order updates' : 'Add your mobile number to sign in with phone'}
                  </p>
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
                  {savingProfile ? (
                    <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Change Password Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg flex items-center gap-2">
                  <Lock className="size-5 text-primary" /> Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="confirm-new-password"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {confirmNewPassword && newPassword === confirmNewPassword && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-xs text-primary">
                      <Check className="size-3" /> Passwords match
                    </motion.p>
                  )}
                </div>
                <Button onClick={handleChangePassword} disabled={savingPassword || !currentPassword || !newPassword || !confirmNewPassword} className="gap-2">
                  {savingPassword ? (
                    <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order History Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg flex items-center gap-2">
                  <Package className="size-5 text-primary" /> Order History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profileLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="shimmer h-16 rounded-lg" />
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="size-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No orders yet</p>
                    <Button variant="outline" onClick={() => setView({ view: 'products' })}>
                      Start Shopping
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {orders.map(order => (
                      <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{order.customerName}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                          <p className="text-xs text-muted-foreground">{order.items.length} item(s)</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="font-semibold text-sm">{formatPrice(order.total, selectedCountry)}</p>
                          <Badge variant={order.status === 'delivered' ? 'default' : order.status === 'pending' ? 'secondary' : 'outline'} className="text-[10px]">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger">
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="font-serif text-lg flex items-center gap-2 text-destructive">
                  <AlertCircle className="size-5" /> Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <h4 className="font-semibold text-sm mb-2">Delete Account</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Once you delete your account, there is no going back. All your data will be permanently removed.
                  </p>
                  <Button variant="destructive" size="sm" disabled>
                    <Trash2 className="size-4 mr-2" /> Delete Account
                  </Button>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2">Sign Out</h4>
                  <p className="text-sm text-muted-foreground mb-4">Sign out of your account on this device.</p>
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
                    <LogOut className="size-4" /> Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Button variant="outline" className="justify-start gap-2 h-11 text-sm" onClick={() => setView({ view: 'products' })}>
            <Store className="size-4" /> Shop
          </Button>
          <Button variant="outline" className="justify-start gap-2 h-11 text-sm" onClick={() => setView({ view: 'wishlist' })}>
            <Heart className="size-4" /> Wishlist
          </Button>
          <Button variant="outline" className="justify-start gap-2 h-11 text-sm" onClick={() => setView({ view: 'cart' })}>
            <ShoppingCart className="size-4" /> Cart
          </Button>
          {user.role === 'admin' && (
            <Button variant="outline" className="justify-start gap-2 h-11 text-sm" onClick={() => setView({ view: 'admin' })}>
              <BarChart3 className="size-4" /> Admin
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Admin Categories View ──────────────────────────────────────────────────

interface CategoryWithCount extends Category {
  _count?: { products: number }
}

function AdminCategories({ onCategoriesChange }: { onCategoriesChange?: () => void }) {
  const { setView } = useAppStore()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const canAdd = isSuperAdmin(user?.adminRole) || hasPermission(user?.permissions, 'categories', 'add')
  const canEdit = isSuperAdmin(user?.adminRole) || hasPermission(user?.permissions, 'categories', 'edit')
  const canDelete = isSuperAdmin(user?.adminRole) || hasPermission(user?.permissions, 'categories', 'delete')
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithCount | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formImage, setFormImage] = useState('')
  const [formStatus, setFormStatus] = useState('active')
  const [formError, setFormError] = useState('')

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      if (Array.isArray(data)) setCategories(data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  const resetForm = () => {
    setFormName('')
    setFormSlug('')
    setFormDescription('')
    setFormImage('')
    setFormStatus('active')
    setFormError('')
  }

  const openEditDialog = (cat: CategoryWithCount) => {
    setSelectedCategory(cat)
    setFormName(cat.name)
    setFormSlug(cat.slug)
    setFormDescription(cat.description || '')
    setFormImage(cat.image || '')
    setFormStatus(cat.status)
    setFormError('')
    setShowEditDialog(true)
  }

  const openDeleteDialog = (cat: CategoryWithCount) => {
    setSelectedCategory(cat)
    setShowDeleteDialog(true)
  }

  const handleAddCategory = async () => {
    if (!formName.trim()) { setFormError('Name is required'); return }
    if (!formSlug.trim()) { setFormError('Slug is required'); return }
    setSaving(true)
    setFormError('')
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          slug: formSlug.trim(),
          description: formDescription.trim() || null,
          image: formImage.trim() || null,
          status: formStatus,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to create category')
        return
      }
      toast({ title: 'Category Created', description: `"${formName}" has been created successfully.` })
      emitCategoryChange('created', data.id)
      await fetchCategories()
      onCategoriesChange?.()
      setShowAddDialog(false)
      resetForm()
    } catch {
      setFormError('Failed to create category')
    } finally {
      setSaving(false)
    }
  }

  const handleEditCategory = async () => {
    if (!selectedCategory) return
    if (!formName.trim()) { setFormError('Name is required'); return }
    if (!formSlug.trim()) { setFormError('Slug is required'); return }
    setSaving(true)
    setFormError('')
    try {
      const res = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          slug: formSlug.trim(),
          description: formDescription.trim() || null,
          image: formImage.trim() || null,
          status: formStatus,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to update category')
        return
      }
      toast({ title: 'Category Updated', description: `"${formName}" has been updated successfully.` })
      emitCategoryChange('updated', data.id)
      await fetchCategories()
      onCategoriesChange?.()
      setShowEditDialog(false)
      resetForm()
    } catch {
      setFormError('Failed to update category')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return
    setSaving(true)
    try {
      const res = await fetch(`/api/categories/${selectedCategory.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Cannot Delete', description: data.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Category Deleted', description: `"${selectedCategory.name}" has been deleted.` })
      emitCategoryChange('deleted', selectedCategory.id)
      await fetchCategories()
      onCategoriesChange?.()
      setShowDeleteDialog(false)
    } catch {
      toast({ title: 'Error', description: 'Failed to delete category.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Category form component (shared between Add and Edit)
  const CategoryForm = () => (
    <div className="space-y-4 py-2">
      {formError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="size-4 shrink-0" />
          {formError}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cat-name">Name *</Label>
          <Input id="cat-name" value={formName} onChange={e => { setFormName(e.target.value); if (!showEditDialog) setFormSlug(generateSlug(e.target.value)) }} placeholder="e.g. Morocco" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat-slug">Slug *</Label>
          <Input id="cat-slug" value={formSlug} onChange={e => setFormSlug(e.target.value)} placeholder="e.g. morocco" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cat-desc">Description</Label>
        <Textarea id="cat-desc" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Category description..." rows={3} className="resize-y" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cat-image">Image URL</Label>
        <Input id="cat-image" value={formImage} onChange={e => setFormImage(e.target.value)} placeholder="/images/categories/my-category.png" />
        {formImage && (
          <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden border">
            <img src={formImage} alt="Preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="cat-status">Status</Label>
        <Select value={formStatus} onValueChange={setFormStatus}>
          <SelectTrigger id="cat-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="coming_soon">Coming Soon</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  )

  const statusBadge = royalCategoryStatusColors

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView({ view: 'admin' })}>
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="font-serif text-3xl font-bold flex items-center gap-2">
                <Tag className="size-7 text-primary" /> Categories
              </h1>
              <p className="text-muted-foreground">Manage your product categories</p>
            </div>
          </div>
          {canAdd && (
            <Button onClick={() => { resetForm(); setShowAddDialog(true) }} className="gap-2">
              <Plus className="size-4" /> Add Category
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderOpen className="size-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No categories found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? 'No categories match your search.' : 'Get started by adding your first category.'}
              </p>
              {!search && canAdd && (
                <Button onClick={() => { resetForm(); setShowAddDialog(true) }} className="gap-2">
                  <Plus className="size-4" /> Add Category
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map(cat => (
              <motion.div key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
                  {/* Category Image/Header */}
                  <div className={`relative h-32 bg-gradient-to-br ${getGradientForCategory(cat.slug)} overflow-hidden`}>
                    {cat.image && (
                      <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay" />
                    )}
                    <div className="absolute top-2 right-2 text-3xl opacity-30">{categoryIcons[cat.slug] || '📁'}</div>
                    <div className="absolute bottom-3 left-3">
                      <span className="text-2xl">{categoryIcons[cat.slug] || '📁'}</span>
                    </div>
                    <Badge className={`absolute top-2 left-2 ${statusBadge[cat.status] || statusBadge.inactive} border-0 text-[10px]`}>
                      {cat.status === 'coming_soon' ? 'Coming Soon' : cat.status.charAt(0).toUpperCase() + cat.status.slice(1)}
                    </Badge>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-serif font-bold text-lg mb-1">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground mb-1">Slug: {cat.slug}</p>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{cat.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {cat._count?.products ?? 0} product{(cat._count?.products ?? 0) !== 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(cat)}>
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(cat)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add Category Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl flex items-center gap-2">
                <Plus className="size-5 text-primary" /> Add New Category
              </DialogTitle>
              <DialogDescription>Create a new category for organizing your products.</DialogDescription>
            </DialogHeader>
            <CategoryForm />
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddCategory} disabled={saving}>
                {saving ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus className="size-4 mr-1" /> Add Category</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl flex items-center gap-2">
                <Pencil className="size-5 text-primary" /> Edit Category
              </DialogTitle>
              <DialogDescription>Update category details.</DialogDescription>
            </DialogHeader>
            <CategoryForm />
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={handleEditCategory} disabled={saving}>
                {saving ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="size-4 mr-1" /> Save Changes</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="size-5 text-destructive" /> Delete Category
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{selectedCategory?.name}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedCategory && (selectedCategory._count?.products ?? 0) > 0 && (
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-lg p-3 text-sm text-primary">
                ⚠️ This category has {selectedCategory._count?.products} product(s). You must move or delete them first.
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteCategory} disabled={saving || (selectedCategory ? (selectedCategory._count?.products ?? 0) > 0 : false)}>
                {saving ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Trash2 className="size-4 mr-1" /> Delete</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}

// ─── Admin Staff View ────────────────────────────────────────────────────────

function AdminStaff() {
  const { setView } = useAppStore()
  const { user: currentUser } = useAuthStore()
  const { toast } = useToast()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formAdminRole, setFormAdminRole] = useState('sub_admin')
  const [formAccessLevel, setFormAccessLevel] = useState<'full' | 'view' | 'update' | 'custom'>('view')
  const [formPermissions, setFormPermissions] = useState<PermissionSet>({})
  const [formError, setFormError] = useState('')

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/staff')
      if (res.status === 403) {
        toast({ title: 'Access Denied', description: 'Only super admin can manage staff.', variant: 'destructive' })
        setView({ view: 'admin' })
        return
      }
      const data = await res.json()
      if (Array.isArray(data)) setStaff(data)
    } catch {}
    setLoading(false)
  }, [toast, setView])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const accessLevelPresets: Record<string, PermissionSet> = {
    full: {
      products: { view: true, add: true, edit: true, delete: true },
      categories: { view: true, add: true, edit: true, delete: true },
      orders: { view: true, edit: true, delete: true },
      staff: { view: true, add: true, edit: true, delete: true },
    },
    view: {
      products: { view: true, add: false, edit: false, delete: false },
      categories: { view: true, add: false, edit: false, delete: false },
      orders: { view: true, edit: false, delete: false },
      staff: { view: true, add: false, edit: false, delete: false },
    },
    update: {
      products: { view: true, add: true, edit: true, delete: false },
      categories: { view: true, add: true, edit: true, delete: false },
      orders: { view: true, edit: true, delete: false },
      staff: { view: true, add: true, edit: true, delete: false },
    },
  }

  const detectAccessLevel = (perms: PermissionSet): 'full' | 'view' | 'update' | 'custom' => {
    for (const [level, preset] of Object.entries(accessLevelPresets)) {
      const match = Object.entries(preset).every(([section, actions]) => {
        const permSection = (perms as Record<string, Record<string, boolean>>)[section]
        return Object.entries(actions).every(([action, val]) => permSection?.[action] === val)
      })
      if (match) return level as 'full' | 'view' | 'update'
    }
    return 'custom'
  }

  const resetForm = () => {
    setFormName(''); setFormEmail(''); setFormPassword('')
    setFormAdminRole('sub_admin')
    setFormAccessLevel('view')
    setFormPermissions(accessLevelPresets.view)
    setFormError('')
  }

  const openEditDialog = (s: StaffMember) => {
    setSelectedStaff(s)
    setFormName(s.name); setFormEmail(s.email); setFormPassword('')
    setFormAdminRole(s.adminRole)
    const perms = parsePermissions(s.permissions)
    setFormPermissions(perms)
    setFormAccessLevel(s.adminRole === 'super_admin' ? 'full' : detectAccessLevel(perms))
    setFormError('')
    setShowEditDialog(true)
  }

  const openDeleteDialog = (s: StaffMember) => {
    setSelectedStaff(s)
    setShowDeleteDialog(true)
  }

  const handleAddStaff = async () => {
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setFormError('Name, email, and password are required'); return
    }
    setSaving(true); setFormError('')
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword,
          adminRole: formAdminRole,
          permissions: formAdminRole === 'super_admin' ? undefined : formPermissions,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || 'Failed to create staff'); return }
      toast({ title: 'Staff Created', description: `${formName} has been added as ${formAdminRole === 'super_admin' ? 'Super Admin' : 'Sub Admin'}.` })
      await fetchStaff()
      setShowAddDialog(false); resetForm()
    } catch { setFormError('Failed to create staff') }
    finally { setSaving(false) }
  }

  const handleEditStaff = async () => {
    if (!selectedStaff) return
    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Name and email are required'); return
    }
    setSaving(true); setFormError('')
    try {
      const body: Record<string, unknown> = {
        name: formName.trim(),
        email: formEmail.trim(),
        adminRole: formAdminRole,
        permissions: formAdminRole === 'super_admin' ? undefined : formPermissions,
      }
      if (formPassword && formPassword.length >= 6) body.password = formPassword
      const res = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || 'Failed to update staff'); return }
      toast({ title: 'Staff Updated', description: `${formName}'s permissions have been updated.` })
      await fetchStaff()
      setShowEditDialog(false); resetForm()
    } catch { setFormError('Failed to update staff') }
    finally { setSaving(false) }
  }

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/staff/${selectedStaff.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Error', description: data.error, variant: 'destructive' }); return
      }
      toast({ title: 'Staff Removed', description: `${selectedStaff.name}'s admin access has been removed.` })
      await fetchStaff()
      setShowDeleteDialog(false)
    } catch { toast({ title: 'Error', description: 'Failed to remove staff.', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const togglePermission = (section: string, action: string) => {
    setFormPermissions(prev => {
      const updated = {
        ...prev,
        [section]: {
          ...(prev as Record<string, Record<string, boolean>>)[section],
          [action]: !((prev as Record<string, Record<string, boolean>>)[section]?.[action]),
        },
      }
      setFormAccessLevel(detectAccessLevel(updated))
      return updated
    })
  }

  const grantAll = (section: string) => {
    const actions = section === 'orders' ? ['view', 'edit', 'delete'] : ['view', 'add', 'edit', 'delete']
    setFormPermissions(prev => {
      const updated = { ...prev, [section]: Object.fromEntries(actions.map(a => [a, true])) }
      setFormAccessLevel(detectAccessLevel(updated))
      return updated
    })
  }

  const revokeAll = (section: string) => {
    const actions = section === 'orders' ? ['view', 'edit', 'delete'] : ['view', 'add', 'edit', 'delete']
    setFormPermissions(prev => {
      const updated = { ...prev, [section]: Object.fromEntries(actions.map(a => [a, false])) }
      setFormAccessLevel(detectAccessLevel(updated))
      return updated
    })
  }

  // Permission sections config
  const permSections = [
    { key: 'products', label: 'Products', icon: Boxes, actions: ['view', 'add', 'edit', 'delete'] },
    { key: 'categories', label: 'Categories', icon: Tag, actions: ['view', 'add', 'edit', 'delete'] },
    { key: 'orders', label: 'Orders', icon: ClipboardList, actions: ['view', 'edit', 'delete'] },
    { key: 'staff', label: 'Staff', icon: UsersRound, actions: ['view', 'add', 'edit', 'delete'] },
  ]

  // Access level info for display
  const accessLevelInfo: Record<string, { label: string; color: string; desc: string; icon: React.ElementType }> = {
    full: { label: 'Full Access', color: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary border-primary/30 dark:border-primary/40', desc: 'Can view, add, edit & delete everything', icon: Shield },
    view: { label: 'View Access', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', desc: 'Can only view — no add, edit or delete', icon: Eye },
    update: { label: 'Update Access', color: 'bg-gold/15 text-gold dark:bg-gold/10 dark:text-gold border-gold/30 dark:border-gold/40', desc: 'Can view, add & edit — cannot delete', icon: Pencil },
    custom: { label: 'Custom', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700', desc: 'Custom permission combination', icon: ToggleLeft },
  }

  // Get access level for a staff member
  const getStaffAccessLevel = (s: StaffMember): string => {
    if (s.adminRole === 'super_admin') return 'full'
    return detectAccessLevel(parsePermissions(s.permissions))
  }

  // Staff form component (shared)
  const StaffForm = () => (
    <div className="space-y-4 py-2">
      {formError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="size-4 shrink-0" /> {formError}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Staff name" />
        </div>
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="staff@example.com" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{showEditDialog ? 'New Password (leave blank to keep current)' : 'Password *'}</Label>
        <Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder={showEditDialog ? 'Leave blank to keep current' : 'Min. 6 characters'} />
      </div>

      {/* Access Level Presets */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Access Level</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['full', 'view', 'update'] as const).map(level => {
            const info = accessLevelInfo[level]
            const LevelIcon = info.icon
            const isActive = formAdminRole === 'super_admin' ? level === 'full' : formAccessLevel === level
            return (
              <button
                key={level}
                type="button"
                onClick={() => {
                  if (level === 'full') {
                    setFormAdminRole('super_admin')
                    setFormPermissions(accessLevelPresets.full)
                    setFormAccessLevel('full')
                  } else {
                    setFormAdminRole('sub_admin')
                    setFormPermissions(accessLevelPresets[level])
                    setFormAccessLevel(level)
                  }
                }}
                className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                  isActive
                    ? `${info.color} border-current shadow-sm`
                    : 'border-border bg-card hover:border-primary/30 hover:bg-muted/50'
                }`}
              >
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="size-5 text-current" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1.5">
                  <LevelIcon className="size-4" />
                  <span className="font-semibold text-sm">{info.label}</span>
                </div>
                <p className="text-xs opacity-80 leading-snug">{info.desc}</p>
              </button>
            )
          })}
        </div>

        {/* Custom option when permissions don't match a preset */}
        {formAdminRole === 'sub_admin' && formAccessLevel === 'custom' && (
          <div className={`flex items-center gap-2 p-3 rounded-xl border-2 ${accessLevelInfo.custom.color} border-current`}>
            <ToggleLeft className="size-4" />
            <span className="font-semibold text-sm">Custom Permissions</span>
            <span className="text-xs opacity-80">— You have a custom combination of permissions</span>
          </div>
        )}
      </div>

      {formAdminRole === 'sub_admin' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Detailed Permissions</Label>
            {formAccessLevel !== 'custom' && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setFormAccessLevel('custom')}>
                Customize...
              </Button>
            )}
          </div>
          {permSections.map(section => {
            const SectionIcon = section.icon
            const perms = (formPermissions as Record<string, Record<string, boolean>>)[section.key] || {}
            const allGranted = section.actions.every(a => perms[a])
            return (
              <Card key={section.key} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
                    <div className="flex items-center gap-2">
                      <SectionIcon className="size-4 text-primary" />
                      <span className="font-medium text-sm">{section.label}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => grantAll(section.key)}>
                        Grant All
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => revokeAll(section.key)}>
                        Revoke All
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 px-4 py-3">
                    {section.actions.map(action => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => togglePermission(section.key, action)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                          perms[action]
                            ? 'bg-primary/10 dark:bg-primary/20 border-primary/30 dark:border-primary/40 text-primary'
                            : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {perms[action] ? <Check className="size-3" /> : <X className="size-3" />}
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                      </button>
                    ))}
                    {allGranted && (
                      <Badge className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary border-0 text-[10px]">
                        Full Access
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {formAdminRole === 'super_admin' && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
          <div className="flex items-center gap-2 text-primary font-medium mb-1">
            <Shield className="size-4" /> Super Admin — Full Access
          </div>
          <p className="text-muted-foreground">Full access to all features and settings. No permission restrictions.</p>
        </div>
      )}
    </div>
  )

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView({ view: 'admin' })}>
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="font-serif text-3xl font-bold flex items-center gap-2">
                <UsersRound className="size-7 text-primary" /> Staff Management
              </h1>
              <p className="text-muted-foreground">Manage admin access and permissions</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setShowAddDialog(true) }} className="gap-2">
            <UserPlus className="size-4" /> Add Staff
          </Button>
        </div>

        {/* Current User Info */}
        {currentUser && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="size-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">You ({currentUser.name})</p>
                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                <div className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${accessLevelInfo.full.color}`}>
                  <Shield className="size-3" /> Full Access — Super Admin
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {/* Staff Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : filteredStaff.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <UsersRound className="size-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No staff found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? 'No staff match your search.' : 'Add your first staff member.'}
              </p>
              {!search && (
                <Button onClick={() => { resetForm(); setShowAddDialog(true) }} className="gap-2">
                  <UserPlus className="size-4" /> Add Staff
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map(s => {
              const perms = parsePermissions(s.permissions)
              const permCount = Object.values(perms).reduce((sum, section) =>
                sum + Object.values(section || {}).filter(Boolean).length, 0)
              const totalPerms = 15 // max permissions across all sections
              const accessLevel = getStaffAccessLevel(s)
              const levelInfo = accessLevelInfo[accessLevel]
              const LevelIcon = levelInfo.icon
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{s.name}</h3>
                            {s.id === currentUser?.id && <Badge variant="secondary" className="text-[10px]">You</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                          <div className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${levelInfo.color}`}>
                            <LevelIcon className="size-3" />
                            {levelInfo.label}
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      {s.adminRole !== 'super_admin' && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Permissions</span>
                            <span>{permCount}/{totalPerms}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${
                              accessLevel === 'full' ? 'bg-primary' :
                              accessLevel === 'update' ? 'bg-gold' :
                              accessLevel === 'view' ? 'bg-emerald-500' :
                              'bg-green-500'
                            }`} style={{ width: `${(permCount / totalPerms) * 100}%` }} />
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {permSections.filter(ps => (perms as Record<string, Record<string, boolean>>)[ps.key]?.view).map(ps => {
                              const sectionPerms = (perms as Record<string, Record<string, boolean>>)[ps.key] || {}
                              const hasFull = ps.actions.every(a => sectionPerms[a])
                              const hasEdit = sectionPerms.edit || sectionPerms.add
                              return (
                                <Badge key={ps.key} variant="secondary" className={`text-[10px] px-1.5 py-0 ${
                                  hasFull ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary' :
                                  hasEdit ? 'bg-gold/15 text-gold dark:bg-gold/10 dark:text-gold' :
                                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                }`}>
                                  <ps.icon className="size-2.5 mr-0.5" /> {ps.label}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Added {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                        {s.id !== currentUser?.id && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(s)}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(s)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Add Staff Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl flex items-center gap-2">
                <UserPlus className="size-5 text-primary" /> Add Staff Member
              </DialogTitle>
              <DialogDescription>Create a new admin with custom permissions.</DialogDescription>
            </DialogHeader>
            <StaffForm />
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddStaff} disabled={saving}>
                {saving ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserPlus className="size-4 mr-1" /> Add Staff</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl flex items-center gap-2">
                <Pencil className="size-5 text-primary" /> Edit Staff
              </DialogTitle>
              <DialogDescription>Update staff details and permissions.</DialogDescription>
            </DialogHeader>
            <StaffForm />
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={handleEditStaff} disabled={saving}>
                {saving ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="size-4 mr-1" /> Save Changes</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="size-5 text-destructive" /> Remove Admin Access
              </DialogTitle>
              <DialogDescription>
                Remove admin access from &quot;{selectedStaff?.name}&quot;? They will be downgraded to a customer account.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteStaff} disabled={saving}>
                {saving ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Trash2 className="size-4 mr-1" /> Remove Access</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}

// ─── Admin Guard Component ────────────────────────────────────────────────────

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn } = useAuthStore()
  const { setView } = useAppStore()
  const { toast } = useToast()
  const [adminEmail, setAdminEmail] = useState('admin@alifaain.com')
  const [adminPassword, setAdminPassword] = useState('')
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminError('')
    setAdminLoading(true)

    if (!adminEmail || !adminPassword) {
      setAdminError('Please fill in all fields')
      setAdminLoading(false)
      return
    }

    const result = await signIn(adminEmail, adminPassword)
    setAdminLoading(false)

    if (result.success) {
      toast({ title: 'Welcome, Admin!', description: 'You have been signed in successfully.' })
    } else {
      setAdminError(result.error || 'Invalid admin credentials')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="size-10 rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"
          />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-16">
        <motion.div {...fadeIn}>
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="relative">
              <div className="absolute inset-0 royal-hero-bg" />
              <div className="absolute inset-0 bg-black/20 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
              <div className="relative p-8 text-center text-white">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="mx-auto mb-4 size-16 rounded-full bg-white/10 ring-2 ring-gold/30 flex items-center justify-center"
                >
                  <ShieldCheck className="size-8 text-gold" />
                </motion.div>
                <h2 className="font-serif text-2xl font-bold mb-2">Admin Access Required</h2>
                <p className="text-white/70 text-sm">Sign in with admin credentials to access the dashboard</p>
              </div>
            </div>
            <Card className="border-0 rounded-none shadow-none">
              <CardContent className="pt-6">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <AnimatePresence>
                    {adminError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                      >
                        <AlertCircle className="size-4 shrink-0" />
                        {adminError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Admin Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="admin-email"
                        type="email"
                        placeholder="admin@example.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="pl-9"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="admin-password"
                        type={showAdminPassword ? 'text' : 'password'}
                        placeholder="Enter admin password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="pl-9 pr-10"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showAdminPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-gold text-green-950 hover:bg-gold/90 font-semibold" size="lg" disabled={adminLoading}>
                    {adminLoading ? (
                      <div className="size-4 border-2 border-green-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="size-4 mr-2" /> Sign In as Admin
                      </>
                    )}
                  </Button>

                  {/* Demo Credentials Hint */}
                  <div className="rounded-lg border border-gold/25 bg-gold/10 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="size-4 text-gold shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gold">Demo Credentials</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                          admin@alifaain.com / admin123
                        </p>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="justify-center border-t pt-4">
                <Button variant="ghost" size="sm" onClick={() => setView({ view: 'home' })} className="text-primary hover:text-primary">
                  <Home className="size-4 mr-2" /> Back to Home
                </Button>
              </CardFooter>
            </Card>
          </div>
        </motion.div>
      </div>
    )
  }

  if (user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center">
        <motion.div {...fadeIn}>
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="relative p-8 text-white">
              <div className="absolute inset-0 royal-hero-bg" />
              <div className="absolute inset-0 bg-black/25 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
              <div className="relative">
                <div className="size-16 rounded-full bg-red-500/15 ring-2 ring-red-400/30 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="size-8 text-red-300" />
                </div>
                <h2 className="font-serif text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-white/70 mb-6">You don&apos;t have admin privileges to access this area.</p>
                <Button className="bg-gold text-green-950 hover:bg-gold/90 font-semibold" onClick={() => setView({ view: 'home' })}>
                  <Home className="size-4 mr-2" /> Go Home
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return <>{children}</>
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function AlifaainPage() {
  const { currentView, selectedCountry } = useAppStore()
  const { fetchSession, user, loading: authLoading } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [seeded, setSeeded] = useState(false)

  // Fetch auth session on mount
  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  // Seed database on first mount
  useEffect(() => {
    if (!seeded) {
      fetch('/api/seed')
        .then(r => r.json())
        .then(() => setSeeded(true))
        .catch(() => setSeeded(true))
    }
  }, [seeded])

  // Fetch products after seed
  useEffect(() => {
    if (seeded) {
      fetch('/api/products')
        .then(r => r.json())
        .then(data => { setProducts(data); setLoading(false) })
        .catch(() => setLoading(false))
      fetch('/api/categories')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setCategories(data) })
        .catch(() => {})
    }
  }, [seeded])

  // Refresh products (called after admin CRUD operations or realtime events)
  const refreshProducts = useCallback(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProducts(data) })
      .catch(() => {})
  }, [])

  // Refresh categories
  const refreshCategories = useCallback(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCategories(data) })
      .catch(() => {})
  }, [])

  // ─── Realtime Socket.io Connection ──────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()

    // Listen for product change events and auto-refresh
    socket.on('product:changed', (data: { action: string; productId?: string }) => {
      console.log(`[Realtime] Product ${data.action} — refreshing...`)
      refreshProducts()
    })

    // Listen for category change events and auto-refresh
    socket.on('category:changed', (data: { action: string; categoryId?: string }) => {
      console.log(`[Realtime] Category ${data.action} — refreshing...`)
      refreshCategories()
    })

    return () => {
      socket.off('product:changed')
      socket.off('category:changed')
      disconnectSocket()
    }
  }, [refreshProducts, refreshCategories])

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentView.view])

  // Track customer engagement on page navigation
  useEffect(() => {
    if (loading || authLoading) return
    if (currentView.view.startsWith('admin')) return

    trackEvent('page_view', currentView.view, {
      userId: user?.id,
      country: selectedCountry,
    })

    if (currentView.view === 'checkout') {
      trackEvent('checkout', 'checkout', {
        userId: user?.id,
        country: selectedCountry,
      })
    }
  }, [currentView.view, loading, authLoading, user?.id, selectedCountry])

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="size-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-serif">Loading Alifaain...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const renderView = () => {
    switch (currentView.view) {
      case 'home':
        return <HomeView products={products} categories={categories} />
      case 'products':
        return <ProductsView products={products} />
      case 'product-detail':
        return <ProductDetailView products={products} />
      case 'about':
        return <AboutView />
      case 'contact':
        return <ContactView />
      case 'cart':
        return <CartView />
      case 'wishlist':
        return <WishlistView products={products} />
      case 'checkout':
        return <CheckoutView />
      case 'signin':
        return <SignInView />
      case 'signup':
        return <SignUpView />
      case 'profile':
        return <ProfileView />
      case 'admin':
        return <AdminGuard><AdminDashboard /></AdminGuard>
      case 'admin-products':
        return <AdminGuard><AdminProducts products={products} onProductsChange={refreshProducts} /></AdminGuard>
      case 'admin-orders':
        return <AdminGuard><AdminOrders /></AdminGuard>
      case 'admin-categories':
        return <AdminGuard><AdminCategories onCategoriesChange={refreshCategories} /></AdminGuard>
      case 'admin-staff':
        return <AdminGuard><AdminStaff /></AdminGuard>
      default:
        return <HomeView products={products} categories={categories} />
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView.view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}
