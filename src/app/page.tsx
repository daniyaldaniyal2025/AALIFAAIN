'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useCartStore, useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { getSocket, disconnectSocket, emitProductChange, emitCategoryChange } from '@/lib/realtime'
import { formatPrice, countries, getCountryByCode } from '@/lib/currency'
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
  Clock, TrendingUp, Users, Mail, Instagram, Twitter, Facebook, MapPin, Phone,
  X, ShoppingBag, CheckCircle2, ArrowRight, Sparkles, Heart, Eye, Filter,
  BarChart3, Boxes, ClipboardList, RefreshCw, Globe, ChevronRight, ChevronLeft, LogIn,
  LogOut, UserCircle, UserPlus, Lock, AlertCircle, Check,
  EyeOff, Save, Calendar, Pencil, ToggleLeft, ToggleRight, ImagePlus, Upload, ImageIcon,
  Info, MessageSquare, Send, Award, Target, Leaf, Handshake, Building2,
  Wallet, Banknote, Smartphone, Receipt, CircleDollarSign, RotateCcw, Tag, FolderOpen, UsersRound, Shield
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer
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

const categoryGradients: Record<string, string> = {
  morocco: 'from-amber-600 via-orange-500 to-red-500',
  korea: 'from-rose-400 via-pink-400 to-fuchsia-400',
  supplements: 'from-emerald-500 via-teal-500 to-cyan-500',
  clothing: 'from-violet-500 via-purple-500 to-indigo-500',
  fragrances: 'from-pink-500 via-rose-400 to-amber-400',
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
  return categoryGradients[slug] || 'from-amber-500 to-orange-500'
}

// ─── Header Component ────────────────────────────────────────────────────────

function Header() {
  const { currentView, setView, selectedCountry, setSelectedCountry } = useAppStore()
  const { items } = useCartStore()
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
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
    { label: 'Cart', view: 'cart' as const, icon: ShoppingCart, badge: totalItems },
    ...(user?.role === 'admin' ? [{ label: 'Admin', view: 'admin' as const, icon: BarChart3 }] : []),
  ]

  const handleNav = (view: 'home' | 'products' | 'cart' | 'admin' | 'about' | 'contact') => {
    setView({ view })
    setMobileOpen(false)
  }

  const handleSignOut = async () => {
    await signOut()
    setUserMenuOpen(false)
    setView({ view: 'home' })
  }

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => handleNav('home')} className="flex items-center gap-2 group">
          <img src="/alifaain-logo.jpg" alt="Alifaain" className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all" />
          <span className="font-serif text-xl font-bold gold-text hidden sm:inline">Alifaain</span>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => {
            const isActive = currentView.view === item.view || (item.view === 'admin' && currentView.view.startsWith('admin'))
            return (
              <Button
                key={item.view}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleNav(item.view)}
                className={`relative ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10'}`}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <motion.span
                    key={item.badge}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] font-bold rounded-full size-5 flex items-center justify-center"
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
            <SelectTrigger className="w-auto gap-1 border-0 bg-secondary/50 h-8 text-xs px-2">
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
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          )}

          {/* Auth Button / User Menu */}
          {mounted && (
            <>
              {user ? (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 h-8"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {user.image ? (
                        <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
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
                          className="absolute right-0 top-full mt-2 w-64 bg-card border rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                          <div className="p-4 border-b">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                {user.image ? (
                                  <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-sm font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                {user.role === 'admin' && (
                                  <Badge variant="secondary" className="text-[10px] mt-1">
                                    <ShieldCheck className="size-3 mr-1" /> Admin
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start gap-2 text-sm"
                              onClick={() => { setView({ view: 'profile' }); setUserMenuOpen(false) }}
                            >
                              <UserCircle className="size-4" /> My Profile
                            </Button>
                            {user.role === 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start gap-2 text-sm"
                                onClick={() => { setView({ view: 'admin' }); setUserMenuOpen(false) }}
                              >
                                <BarChart3 className="size-4" /> Admin Dashboard
                              </Button>
                            )}
                            <Separator className="my-1" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start gap-2 text-sm text-destructive hover:text-destructive"
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
                  variant="default"
                  size="sm"
                  className="gap-1.5 h-8"
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
              <Button variant="ghost" size="icon" className="md:hidden size-8">
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
                    {item.badge > 0 && (
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
  return (
    <footer className="mt-auto border-t bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/alifaain-logo.jpg" alt="Alifaain" className="h-8 w-8 rounded-full object-cover" />
              <span className="font-serif text-lg font-bold gold-text">Alifaain</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your destination for authentic Moroccan beauty traditions and innovative Korean skincare. Premium quality, delivered with care.
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"><Instagram className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"><Twitter className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"><Facebook className="size-4" /></Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { label: 'Home', view: 'home' as const },
                { label: 'Shop All', view: 'products' as const },
                { label: 'About Us', view: 'about' as const },
                { label: 'Contact', view: 'contact' as const },
                { label: 'Cart', view: 'cart' as const },
              ].map(l => (
                <li key={l.view}>
                  <button onClick={() => setView({ view: l.view })} className="hover:text-primary transition-colors">
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-serif font-semibold mb-4">Categories</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {['Morocco', 'Korea', 'Supplements', 'Clothing', 'Fragrances'].map(c => (
                <li key={c}>
                  <button onClick={() => setView({ view: 'products', params: { category: c.toLowerCase() } })} className="hover:text-primary transition-colors">
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-serif font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Mail className="size-4 text-primary" /> hello@alifaain.com</li>
              <li className="flex items-center gap-2"><Phone className="size-4 text-primary" /> +966 50 123 4567</li>
              <li className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> Riyadh, Saudi Arabia</li>
            </ul>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="text-center text-xs text-muted-foreground">
          © 2024 Alifaain. All rights reserved.
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
    gradient: 'from-amber-600 via-orange-500 to-red-500',
    emoji: '🇲🇦',
    cta: 'Shop Morocco',
    category: 'morocco',
    image: '/images/banners/morocco-banner.png',
  },
  {
    id: 2,
    title: 'K-Beauty Festival',
    subtitle: 'Save up to 25%',
    description: 'Premium Korean skincare essentials — Centella, Hyalu-Cica & Retinol at unbeatable prices',
    gradient: 'from-rose-400 via-pink-500 to-fuchsia-500',
    emoji: '🇰🇷',
    cta: 'Shop Korea',
    category: 'korea',
    image: '/images/banners/korea-banner.png',
  },
  {
    id: 3,
    title: 'Wellness Sale',
    subtitle: '20% OFF Supplements',
    description: 'Boost your inner beauty with our premium Shilajit & wellness packs',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    emoji: '💊',
    cta: 'Shop Supplements',
    category: 'supplements',
    image: '/images/banners/supplements-banner.png',
  },
  {
    id: 4,
    title: 'Free Shipping',
    subtitle: 'Orders over 200 SAR',
    description: 'Enjoy free delivery across Saudi Arabia on all orders above 200 SAR',
    gradient: 'from-violet-500 via-purple-500 to-indigo-500',
    emoji: '🚚',
    cta: 'Start Shopping',
    category: '',
    image: '/images/banners/shipping-banner.png',
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
              {/* Gradient Overlay - stronger on left for text readability */}
              <div className={`absolute inset-0 bg-gradient-to-r ${promoBanners[current].gradient} opacity-70`} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

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
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
        <div className="absolute inset-0">
          <img src="/images/hero/banner.png" alt="Alifaain Beauty" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-amber-500/5 to-orange-500/10" />
        </div>
        <div className="absolute top-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-orange-300/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
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
            className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-8"
          >
            Authentic Moroccan traditions meet innovative Korean skincare. Experience the best of both worlds.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" className="text-base px-8" onClick={() => setView({ view: 'products' })}>
              Shop Now <ArrowRight className="size-4 ml-1" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" onClick={() => {
              document.getElementById('categories-section')?.scrollIntoView({ behavior: 'smooth' })
            }}>
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
              <Badge className="mb-4 px-4 py-1.5 text-sm font-medium bg-red-500 text-white border-0 hover:bg-red-600">
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
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button size="icon" variant="secondary" className="size-8 rounded-full" onClick={handleAdd}>
              <ShoppingCart className="size-3.5" />
            </Button>
          </div>
          {product.discount > 0 && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white border-0 text-[10px] font-bold">
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

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0">
          <img src="/images/about/our-story.png" alt="Our Story" className="w-full h-full object-cover" />
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
              <Sparkles className="size-3.5 mr-1.5" /> Our Story
            </Badge>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white leading-tight">
              Where Ancient Traditions Meet{' '}
              <span className="gold-text">Modern Beauty</span>
            </h1>
            <p className="text-white/80 text-lg sm:text-xl mb-8 max-w-lg">
              Born from a passion for authentic beauty rituals, Alifaain bridges the timeless traditions of Morocco with the innovative science of Korean skincare.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Story Section */}
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
                <img src="/images/about/our-story.png" alt="Alifaain Beauty Products" className="w-full h-auto object-cover" />
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
                <Info className="size-3.5 mr-1.5" /> About Alifaain
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-6">
                A Journey of <span className="gold-text">Beauty & Heritage</span>
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Alifaain was founded with a simple yet powerful vision — to bring the world&apos;s most authentic and effective beauty traditions to your doorstep. Our name, meaning &ldquo;thousands&rdquo; in Arabic, represents the thousands of women across generations who have perfected these beauty rituals.
              </p>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                From the argan forests of Morocco to the cutting-edge laboratories of Seoul, we curate only the finest products that honor traditional wisdom while embracing modern innovation. Every product in our collection tells a story of heritage, quality, and transformation.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Based in Riyadh, Saudi Arabia, we serve beauty enthusiasts across the region and beyond, delivering premium skincare, traditional beauty essentials, and wellness supplements with care and authenticity.
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

      {/* Mission Section */}
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
                <Target className="size-3.5 mr-1.5" /> Our Mission
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-6">
                Empowering Beauty Through <span className="gold-text">Authenticity</span>
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Our mission is to make authentic, time-tested beauty traditions accessible to everyone. We believe that true beauty comes from understanding and honoring the wisdom of centuries-old practices while leveraging the best of modern skincare science.
              </p>
              <div className="space-y-4">
                {[
                  { icon: ShieldCheck, title: 'Authenticity First', desc: 'Every product is sourced directly from trusted artisans and manufacturers.' },
                  { icon: Leaf, title: 'Natural Ingredients', desc: 'We prioritize natural, sustainably-sourced ingredients in every formulation.' },
                  { icon: Heart, title: 'Community Driven', desc: 'We support the communities and artisans who create these beauty treasures.' },
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
                <img src="/images/about/mission.png" alt="Our Mission" className="w-full h-auto object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeIn} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">Alifaain in Numbers</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Growing every day with the trust of our valued customers</p>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6"
          >
            {[
              { icon: ShoppingBag, value: '44+', label: 'Premium Products' },
              { icon: Globe, value: '21+', label: 'Countries Served' },
              { icon: Users, value: '5000+', label: 'Happy Customers' },
              { icon: Award, value: '100%', label: 'Authentic & Genuine' },
            ].map(stat => (
              <motion.div key={stat.label} variants={staggerItem}>
                <Card className="text-center h-full gradient-border hover:shadow-lg transition-shadow">
                  <CardContent className="pt-8 pb-6 flex flex-col items-center">
                    <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <stat.icon className="size-7 text-primary" />
                    </div>
                    <p className="font-serif text-3xl sm:text-4xl font-bold gold-text mb-2">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Team Section */}
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
                <img src="/images/about/team.png" alt="Our Team" className="w-full h-auto object-cover" />
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
                <Users className="size-3.5 mr-1.5" /> Our Team
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-6">
                Passionate Experts, <span className="gold-text">Dedicated to You</span>
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Behind Alifaain is a dedicated team of beauty enthusiasts, skincare experts, and customer care professionals who share one common goal — helping you discover your best self.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Our team includes certified dermatologists, traditional beauty practitioners, and product specialists who carefully vet every item in our collection. We personally test and approve each product to ensure it meets our high standards of quality and authenticity.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Handshake, label: 'Trusted Partners' },
                  { icon: Award, label: 'Quality Certified' },
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

      {/* CTA Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            {...fadeIn}
            viewport={{ once: true }}
            className="relative rounded-2xl overflow-hidden p-8 sm:p-12 lg:p-16 text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-amber-600 to-primary" />
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Experience the Difference?
              </h2>
              <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">
                Discover our curated collection of authentic Moroccan and innovative Korean beauty products.
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
                  className="border-white/30 text-white hover:bg-white/10 gap-2"
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
      <section className="relative overflow-hidden py-20 sm:py-28">
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
                detail: 'hello@alifaain.com',
                sub: 'We reply within 24 hours',
                color: 'bg-blue-500/10 text-blue-500',
              },
              {
                icon: Phone,
                title: 'Call Us',
                detail: '+966 50 123 4567',
                sub: 'Sun–Thu, 9AM–6PM AST',
                color: 'bg-emerald-500/10 text-emerald-500',
              },
              {
                icon: MapPin,
                title: 'Visit Us',
                detail: 'Riyadh, Saudi Arabia',
                sub: 'King Fahd Road District',
                color: 'bg-amber-500/10 text-amber-500',
              },
              {
                icon: Clock,
                title: 'Business Hours',
                detail: 'Sun–Thu: 9AM–6PM',
                sub: 'Fri–Sat: Closed',
                color: 'bg-purple-500/10 text-purple-500',
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
                  <div className="flex gap-3">
                    {[
                      { icon: Instagram, label: 'Instagram', color: 'hover:bg-pink-500/10 hover:text-pink-500' },
                      { icon: Twitter, label: 'Twitter', color: 'hover:bg-sky-500/10 hover:text-sky-500' },
                      { icon: Facebook, label: 'Facebook', color: 'hover:bg-blue-500/10 hover:text-blue-500' },
                    ].map(social => (
                      <Button key={social.label} variant="outline" size="lg" className={`gap-2 ${social.color}`}>
                        <social.icon className="size-5" />
                        <span className="hidden sm:inline">{social.label}</span>
                      </Button>
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
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button size="sm" onClick={handleAdd} className="h-8">
              <ShoppingCart className="size-3.5 mr-1" /> Add to Cart
            </Button>
          </div>
          {product.discount > 0 && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white border-0 text-[10px] font-bold">
              -{product.discount}%
            </Badge>
          )}
          {product.featured && product.discount === 0 && (
            <Badge className="absolute top-2 left-2 bg-white/20 text-white border-0 text-[10px]">
              <Star className="size-3 mr-0.5" /> Featured
            </Badge>
          )}
          {product.stock < 10 && (
            <Badge variant="destructive" className="absolute top-2 right-2 text-[10px]">Low Stock</Badge>
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
              <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
                <Badge className="bg-white/20 text-white border-0">{product.category.name}</Badge>
                {product.discount > 0 && <Badge className="bg-red-500 text-white border-0 font-bold">-{product.discount}% OFF</Badge>}
                {product.featured && product.discount === 0 && <Badge className="bg-white/20 text-white border-0"><Star className="size-3 mr-1" />Featured</Badge>}
              </div>
              <div className="absolute bottom-4 right-4 animate-float pointer-events-none">
                <div className="size-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Heart className="size-6 text-white/60" />
                </div>
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
                  <Badge className="bg-red-500 text-white border-0">Save {product.discount}%</Badge>
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

            <Button size="lg" className="w-full sm:w-auto px-12 text-base" onClick={handleAddToCart} disabled={product.stock === 0}>
              <ShoppingCart className="size-5 mr-2" /> Add to Cart
            </Button>
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
  const { setView, selectedCountry } = useAppStore()
  const total = totalPrice()
  const shipping = total >= 200 ? 0 : 25

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
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(total, selectedCountry)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? <span className="text-emerald-600 font-medium">Free</span> : formatPrice(shipping, selectedCountry)}</span>
                </div>
                {total < 200 && (
                  <p className="text-xs text-muted-foreground">Add {formatPrice(200 - total, selectedCountry)} more for free shipping!</p>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total + shipping, selectedCountry)}</span>
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

// ─── Checkout View ───────────────────────────────────────────────────────────

function CheckoutView() {
  const { items, totalPrice, clearCart } = useCartStore()
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
  const shipping = total >= 200 ? 0 : 25
  const grandTotal = total + shipping

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
        }),
      })
      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        toast({ title: 'Error', description: 'Failed to create order.', variant: 'destructive' })
        setStep('info')
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
    { id: 'card', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard', color: 'from-blue-500 to-blue-600' },
    { id: 'mada', label: 'Mada', icon: Banknote, desc: 'Saudi debit cards', color: 'from-emerald-500 to-teal-500' },
    { id: 'applepay', label: 'Apple Pay', icon: Smartphone, desc: 'Quick & secure', color: 'from-gray-700 to-gray-900' },
    { id: 'cod', label: 'Cash on Delivery', icon: Wallet, desc: 'Pay when received', color: 'from-amber-500 to-orange-500' },
  ]

  // ─── Success State ──────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="size-10 text-emerald-600" />
          </div>
          <h2 className="font-serif text-3xl font-bold mb-4">Payment Successful!</h2>
          <p className="text-muted-foreground mb-2">Thank you for your purchase.</p>
          <p className="text-sm text-muted-foreground mb-1">Order ID: <span className="font-mono text-foreground">{orderId.slice(0, 12)}</span></p>
          <p className="text-sm text-muted-foreground mb-1">Transaction: <span className="font-mono text-foreground">{transactionId}</span></p>
          <Badge className="mt-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" variant="secondary">
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
          <div className="size-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="size-10 text-red-600" />
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
                  step === s ? 'bg-primary text-primary-foreground' : s === 'info' && step === 'payment' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-secondary text-muted-foreground'
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
                    <Input id="phone" name="phone" type="tel" placeholder="+966 5X XXX XXXX" value={form.phone} onChange={handleChange} className="mt-1.5" />
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
                <Card className="border-emerald-200 dark:border-emerald-800">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Check className="size-4 text-emerald-600" />
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
                  <Card className="border-amber-300 dark:border-amber-800">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="size-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shrink-0">
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? <span className="text-emerald-600">Free</span> : formatPrice(shipping, selectedCountry)}</span>
                </div>
                {paymentMethod === 'cod' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">COD Fee</span>
                    <span>{formatPrice(10, selectedCountry)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(grandTotal + (paymentMethod === 'cod' ? 10 : 0), selectedCountry)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
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
    { title: 'Total Products', value: stats?.totalProducts ?? 0, icon: Package, color: 'from-amber-500 to-orange-500' },
    { title: 'Total Orders', value: stats?.totalOrders ?? 0, icon: ClipboardList, color: 'from-emerald-500 to-teal-500' },
    { title: 'Total Revenue', value: stats?.totalRevenue ?? 0, icon: DollarSign, color: 'from-primary to-amber-500', isPrice: true },
    { title: 'Paid Revenue', value: stats?.paidRevenue ?? 0, icon: CircleDollarSign, color: 'from-emerald-600 to-green-500', isPrice: true },
  ]

  const chartData = useMemo(() => {
    if (!stats?.monthlyRevenue) return []
    return stats.monthlyRevenue.map(d => ({
      month: d.month ? new Date(d.month + '-01').toLocaleDateString('en', { month: 'short' }) : 'N/A',
      revenue: d.revenue || 0,
    }))
  }, [stats])

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    processing: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  const paymentStatusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    refunded: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }

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
                            <stop offset="5%" stopColor="oklch(0.75 0.16 75)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="oklch(0.75 0.16 75)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" tick={{ fill: 'oklch(0.5 0.02 60)' }} />
                        <YAxis className="text-xs" tick={{ fill: 'oklch(0.5 0.02 60)' }} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'oklch(1 0 0)', border: '1px solid oklch(0.92 0.01 80)', borderRadius: '8px' }}
                          formatter={(value: number) => [formatPrice(value, selectedCountry), 'Revenue']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="oklch(0.75 0.16 75)" fill="url(#goldGradient)" strokeWidth={2} />
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
                            <div className="size-10 rounded-md overflow-hidden bg-gradient-to-br from-primary/10 to-amber-500/10 shrink-0">
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
                            <span className={`text-sm ${p.stock < 10 ? 'text-destructive font-semibold' : p.stock < 30 ? 'text-amber-600 font-medium' : ''}`}>
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
                                <Star className="size-4 text-amber-500 fill-amber-500" />
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
                  <div className="size-14 rounded-md overflow-hidden bg-gradient-to-br from-primary/10 to-amber-500/10 shrink-0">
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
                    <div className="size-28 rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-amber-500/10 shrink-0">
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
                          <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                            <Star className="size-3 mr-1 fill-amber-500 text-amber-500" /> Featured
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
                        <p className={`font-bold ${selectedProduct.stock < 10 ? 'text-destructive' : selectedProduct.stock < 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
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

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    processing: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  const paymentStatusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    refunded: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }

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
                                  className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                                  onClick={() => updatePaymentStatus(order.id, 'paid')}
                                >
                                  <Check className="size-3 mr-1" /> Mark Paid
                                </Button>
                              )}
                              {order.paymentStatus === 'paid' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-purple-600 hover:text-purple-700"
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    const result = await signIn(email, password)
    setLoading(false)

    if (result.success) {
      const isAdmin = email === 'admin@alifaain.com'
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
    setEmail('admin@alifaain.com')
    setPassword('')
    setError('')
  }

  const switchToCustomer = () => {
    setLoginType('customer')
    setEmail('')
    setPassword('')
    setError('')
  }

  // Dynamic left panel colors based on login type
  const leftGradient = loginType === 'admin'
    ? 'from-slate-800 via-slate-700 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950'
    : 'from-amber-600 via-orange-500 to-yellow-500'
  const mobileGradient = loginType === 'admin'
    ? 'from-slate-800 via-slate-700 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950'
    : 'from-amber-600 via-orange-500 to-yellow-500'

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
                {/* Login Type Tabs */}
                <div className="flex rounded-lg bg-muted p-1 mb-6">
                  <button
                    type="button"
                    onClick={switchToCustomer}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      loginType === 'customer'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <UserCircle className="size-4" />
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={switchToAdmin}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      loginType === 'admin'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ShieldCheck className="size-4" />
                    Admin
                  </button>
                </div>

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
                    <Label htmlFor="email">
                      {loginType === 'admin' ? 'Admin Email' : 'Email Address'}
                    </Label>
                    <div className="relative">
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
                      className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-3"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Demo Credentials</p>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 font-mono">
                            admin@alifaain.com / admin123
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </form>
              </CardContent>
              <CardFooter className="justify-center border-t pt-6">
                {loginType === 'customer' ? (
                  <p className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <button
                      onClick={() => setView({ view: 'signup' })}
                      className="text-primary font-semibold hover:underline"
                    >
                      Create one
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Admin access is restricted to authorized personnel only.
                  </p>
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

  // Password strength
  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (pwd.length === 0) return { label: '', color: '', width: '0%' }
    if (pwd.length < 6) return { label: 'Weak', color: 'bg-red-500', width: '33%' }
    if (pwd.length <= 8) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' }
    const hasMixed = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd)
    const hasNumbers = /\d/.test(pwd)
    if (hasMixed && hasNumbers) return { label: 'Strong', color: 'bg-emerald-500', width: '100%' }
    return { label: 'Medium', color: 'bg-yellow-500', width: '66%' }
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

    const result = await signUp(name, email, password)
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
            className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6"
          >
            <Check className="size-10 text-emerald-600" />
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
          className="hidden lg:flex lg:w-5/12 relative bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 rounded-l-2xl overflow-hidden items-center justify-center p-10"
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
              <div className="lg:hidden relative bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 p-6 rounded-t-xl">
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
                          passwordStrength.label === 'Weak' ? 'text-red-500' :
                          passwordStrength.label === 'Medium' ? 'text-yellow-500' : 'text-emerald-500'
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
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-xs text-emerald-600">
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
        if (profileData?.user?._count?.orders !== undefined) {
          setOrderCount(profileData.user._count.orders)
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
    setSavingProfile(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Profile updated', description: 'Your profile has been updated successfully.' })
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
              <div className="relative bg-gradient-to-br from-primary/10 via-amber-500/5 to-orange-500/10 p-6 sm:p-8">
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
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-xs text-emerald-600">
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

  const statusBadge: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    coming_soon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

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
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400">
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
    full: { label: 'Full Access', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700', desc: 'Can view, add, edit & delete everything', icon: Shield },
    view: { label: 'View Access', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-300 dark:border-sky-700', desc: 'Can only view — no add, edit or delete', icon: Eye },
    update: { label: 'Update Access', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-700', desc: 'Can view, add & edit — cannot delete', icon: Pencil },
    custom: { label: 'Custom', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300 dark:border-purple-700', desc: 'Custom permission combination', icon: ToggleLeft },
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
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                            : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {perms[action] ? <Check className="size-3" /> : <X className="size-3" />}
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                      </button>
                    ))}
                    {allGranted && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px]">
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
                              accessLevel === 'full' ? 'bg-emerald-500' :
                              accessLevel === 'update' ? 'bg-amber-500' :
                              accessLevel === 'view' ? 'bg-sky-500' :
                              'bg-purple-500'
                            }`} style={{ width: `${(permCount / totalPerms) * 100}%` }} />
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {permSections.filter(ps => (perms as Record<string, Record<string, boolean>>)[ps.key]?.view).map(ps => {
                              const sectionPerms = (perms as Record<string, Record<string, boolean>>)[ps.key] || {}
                              const hasFull = ps.actions.every(a => sectionPerms[a])
                              const hasEdit = sectionPerms.edit || sectionPerms.add
                              return (
                                <Badge key={ps.key} variant="secondary" className={`text-[10px] px-1.5 py-0 ${
                                  hasFull ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                  hasEdit ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
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
          <div className="gradient-border rounded-2xl">
            <Card className="border-0 shadow-xl">
              <CardHeader className="text-center pb-2">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="mx-auto mb-4 size-16 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <ShieldCheck className="size-8 text-primary" />
                </motion.div>
                <CardTitle className="font-serif text-2xl">Admin Access Required</CardTitle>
                <CardDescription>Sign in with admin credentials to access the dashboard</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
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

                  <Button type="submit" className="w-full" size="lg" disabled={adminLoading}>
                    {adminLoading ? (
                      <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="size-4 mr-2" /> Sign In as Admin
                      </>
                    )}
                  </Button>

                  {/* Demo Credentials Hint */}
                  <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Demo Credentials</p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 font-mono">
                          admin@alifaain.com / admin123
                        </p>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="justify-center border-t pt-4">
                <Button variant="ghost" size="sm" onClick={() => setView({ view: 'home' })}>
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
          <div className="gradient-border rounded-2xl">
            <Card className="border-0">
              <CardContent className="p-8">
                <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="size-8 text-destructive" />
                </div>
                <h2 className="font-serif text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-muted-foreground mb-6">You don&apos;t have admin privileges to access this area.</p>
                <Button onClick={() => setView({ view: 'home' })}>
                  <Home className="size-4 mr-2" /> Go Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    )
  }

  return <>{children}</>
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function AlifaainPage() {
  const { currentView } = useAppStore()
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
