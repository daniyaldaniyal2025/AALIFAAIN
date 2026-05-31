'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useCartStore, useAppStore } from '@/stores/app-store'
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
import {
  ShoppingCart, Sun, Moon, Menu, Home, Store, ShieldCheck, Truck, CreditCard, Star,
  Plus, Minus, Trash2, ArrowLeft, Search, ChevronDown, Package, DollarSign,
  Clock, TrendingUp, Users, Mail, Instagram, Twitter, Facebook, MapPin, Phone,
  X, ShoppingBag, CheckCircle2, ArrowRight, Sparkles, Heart, Eye, Filter,
  BarChart3, Boxes, ClipboardList, RefreshCw, Globe, ChevronRight
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
  categoryId: string
  featured: boolean
  stock: number
  status: string
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
    { label: 'Cart', view: 'cart' as const, icon: ShoppingCart, badge: totalItems },
    { label: 'Admin', view: 'admin' as const, icon: BarChart3 },
  ]

  const handleNav = (view: 'home' | 'products' | 'cart' | 'admin') => {
    setView({ view })
    setMobileOpen(false)
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
                <span className="hidden lg:inline">{item.label}</span>
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

// ─── Home View ───────────────────────────────────────────────────────────────

function HomeView({ products }: { products: Product[] }) {
  const { setView, setSelectedCategory } = useAppStore()
  const { addItem } = useCartStore()
  const { selectedCountry } = useAppStore()
  const { toast } = useToast()

  const featuredProducts = useMemo(() => products.filter(p => p.featured).slice(0, 8), [products])

  const categories = useMemo(() => {
    const cats: { name: string; slug: string; description: string; count: number; comingSoon: boolean }[] = []
    const catMap = new Map<string, number>()
    products.forEach(p => { catMap.set(p.category.name, (catMap.get(p.category.name) || 0) + 1) })

    const defaults = [
      { name: 'Morocco', slug: 'morocco', description: 'Traditional Moroccan beauty secrets', comingSoon: false },
      { name: 'Korea', slug: 'korea', description: 'Innovative Korean skincare', comingSoon: false },
      { name: 'Supplements', slug: 'supplements', description: 'Inner beauty & wellness', comingSoon: false },
      { name: 'Clothing', slug: 'clothing', description: 'Premium fashion collection', comingSoon: true },
      { name: 'Fragrances', slug: 'fragrances', description: 'Exquisite scent collection', comingSoon: true },
    ]

    defaults.forEach(d => {
      cats.push({ ...d, count: catMap.get(d.name) || 0 })
    })
    return cats
  }, [products])

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
                    {cat.slug !== 'clothing' && cat.slug !== 'fragrances' && (
                      <img src={`/images/categories/${cat.slug}.png`} alt={cat.name} className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay" />
                    )}
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
            <motion.div {...fadeIn} viewport={{ once: true }} className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-2">Featured Products</h2>
                <p className="text-muted-foreground">Hand-picked favorites just for you</p>
              </div>
              <Button variant="outline" onClick={() => setView({ view: 'products' })} className="hidden sm:flex">
                View All <ArrowRight className="size-4 ml-1" />
              </Button>
            </motion.div>

            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="mt-4 sm:hidden text-center">
              <Button variant="outline" onClick={() => setView({ view: 'products' })}>
                View All Products <ArrowRight className="size-4 ml-1" />
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

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1, image: product.image || undefined })
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
          {product.featured && (
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
            <span className="font-bold text-primary">{formatPrice(product.price, selectedCountry)}</span>
            <Button size="sm" onClick={handleAdd} className="h-7 text-xs">
              <Plus className="size-3 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Products View ───────────────────────────────────────────────────────────

function ProductsView({ products }: { products: Product[] }) {
  const { selectedCountry, selectedCategory, setSelectedCategory, searchQuery, setSearchQuery } = useAppStore()
  const [sortBy, setSortBy] = useState('name-asc')
  const [priceRange, setPriceRange] = useState([0, 500])
  const [selectedCats, setSelectedCats] = useState<string[]>(selectedCategory ? [selectedCategory] : [])
  const [showFilters, setShowFilters] = useState(false)

  const allCategories = useMemo(() => {
    const map = new Map<string, Category>()
    products.forEach(p => { if (!map.has(p.category.id)) map.set(p.category.id, p.category) })
    return Array.from(map.values())
  }, [products])

  // Merge store category with local filters
  const activeCategories = useMemo(() => {
    if (selectedCategory) return [selectedCategory]
    return selectedCats
  }, [selectedCategory, selectedCats])

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => p.status === 'active' && p.category.status !== 'coming_soon')

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
                    {allCategories.filter(c => c.status !== 'coming_soon').map(cat => (
                      <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox checked={selectedCats.includes(cat.slug)} onCheckedChange={() => toggleCat(cat.slug)} />
                        <span>{categoryIcons[cat.slug]} {cat.name}</span>
                      </label>
                    ))}
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
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setSelectedCats([]); setPriceRange([0, 500]); setSearchQuery('') }}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-4">{filteredProducts.length} products found</div>
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

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1, image: product.image || undefined })
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
          {product.featured && (
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
            <span className="font-bold text-primary text-lg">{formatPrice(product.price, selectedCountry)}</span>
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

  const product = useMemo(() => {
    const id = currentView.params?.id
    return products.find(p => p.id === id) || null
  }, [products, currentView.params])

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
    addItem({ productId: product.id, name: product.name, price: product.price, quantity, image: product.image || undefined })
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
          {/* Image */}
          <div className={`relative rounded-2xl overflow-hidden ${product.image ? '' : 'bg-gradient-to-br ' + getGradientForCategory(product.category.slug)} aspect-square flex items-center justify-center`}>
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl font-bold text-white/15 font-serif">{getProductInitials(product.name)}</span>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="absolute top-4 left-4 flex gap-2">
              <Badge className="bg-white/20 text-white border-0">{product.category.name}</Badge>
              {product.featured && <Badge className="bg-white/20 text-white border-0"><Star className="size-3 mr-1" />Featured</Badge>}
            </div>
            <div className="absolute bottom-4 right-4 animate-float">
              <div className="size-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Heart className="size-6 text-white/60" />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <Badge variant="secondary" className="w-fit mb-3">{categoryIcons[product.category.slug]} {product.category.name}</Badge>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-4">{product.name}</h1>
            <p className="text-muted-foreground leading-relaxed mb-6">{product.description}</p>

            <div className="mb-6">
              <span className="text-3xl font-bold text-primary">{formatPrice(product.price, selectedCountry)}</span>
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderId, setOrderId] = useState('')

  const [form, setForm] = useState({ name: '', email: '', phone: '' })

  const total = totalPrice()
  const shipping = total >= 200 ? 0 : 25

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      toast({ title: 'Missing fields', description: 'Please fill in your name and email.', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.phone || undefined,
          items: items.map(i => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
          currency: getCountryByCode(selectedCountry).currency,
          country: selectedCountry,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setOrderId(data.id)
        setOrderPlaced(true)
        clearCart()
        toast({ title: 'Order placed!', description: 'Your order has been placed successfully.' })
      } else {
        toast({ title: 'Error', description: 'Failed to place order. Please try again.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' })
    }
    setIsSubmitting(false)
  }

  if (orderPlaced) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="size-10 text-emerald-600" />
          </div>
          <h2 className="font-serif text-3xl font-bold mb-4">Order Confirmed!</h2>
          <p className="text-muted-foreground mb-2">Thank you for your purchase.</p>
          <p className="text-sm text-muted-foreground mb-8">Order ID: <span className="font-mono text-foreground">{orderId.slice(0, 12)}</span></p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => setView({ view: 'products' })}>Continue Shopping</Button>
            <Button variant="outline" onClick={() => setView({ view: 'home' })}>Back to Home</Button>
          </div>
        </motion.div>
      </div>
    )
  }

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

        <h1 className="font-serif text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Customer Information</CardTitle>
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
            </Card>
          </div>

          {/* Order Summary */}
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
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total + shipping, selectedCountry)}</span>
                </div>
                <Button className="w-full mt-4" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><RefreshCw className="size-4 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <><CreditCard className="size-4 mr-2" /> Place Order</>
                  )}
                </Button>
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
    { title: 'Pending Orders', value: stats?.ordersByStatus?.find(o => o.status === 'pending')?._count.status ?? 0, icon: Clock, color: 'from-rose-500 to-pink-500' },
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
    shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Overview of your store performance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setView({ view: 'admin-products' })}>
              <Boxes className="size-4 mr-1" /> Products
            </Button>
            <Button variant="outline" onClick={() => setView({ view: 'admin-orders' })}>
              <ClipboardList className="size-4 mr-1" /> Orders
            </Button>
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

function AdminProducts({ products }: { products: Product[] }) {
  const { selectedCountry } = useAppStore()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  const filtered = useMemo(() => {
    let result = products
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q))
    }
    if (catFilter !== 'all') {
      result = result.filter(p => p.category.slug === catFilter)
    }
    return result
  }, [products, search, catFilter])

  const allCats = useMemo(() => {
    const map = new Map<string, { slug: string; name: string }>()
    products.forEach(p => { if (!map.has(p.category.id)) map.set(p.category.id, { slug: p.category.slug, name: p.category.name }) })
    return Array.from(map.values())
  }, [products])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">Manage Products</h1>
            <p className="text-muted-foreground">{products.length} total products</p>
          </div>
          <Button variant="outline" onClick={() => useAppStore.getState().setView({ view: 'admin' })}>
            <ArrowLeft className="size-4 mr-1" /> Dashboard
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allCats.map(c => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="size-10 rounded-md overflow-hidden bg-gradient-to-br from-primary/10 to-amber-500/10">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[8px] font-bold text-primary/40">{getProductInitials(p.name)}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{p.category.name}</Badge></TableCell>
                      <TableCell>{formatPrice(p.price, selectedCountry)}</TableCell>
                      <TableCell>
                        <span className={p.stock < 10 ? 'text-destructive font-semibold' : ''}>{p.stock}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ─── Admin Orders View ───────────────────────────────────────────────────────

function AdminOrders() {
  const { selectedCountry } = useAppStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => { setOrders(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return orders
    return orders.filter(o => o.status === statusFilter)
  }, [orders, statusFilter])

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    processing: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div {...fadeIn}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">Manage Orders</h1>
            <p className="text-muted-foreground">{orders.length} total orders</p>
          </div>
          <Button variant="outline" onClick={() => useAppStore.getState().setView({ view: 'admin' })}>
            <ArrowLeft className="size-4 mr-1" /> Dashboard
          </Button>
        </div>

        <div className="mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading orders...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id.slice(0, 10)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{order.customerName}</p>
                            <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{order.items.length} item(s)</TableCell>
                        <TableCell className="font-semibold">{formatPrice(order.total, selectedCountry)}</TableCell>
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
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function AlifaainPage() {
  const { currentView } = useAppStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [seeded, setSeeded] = useState(false)

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
    }
  }, [seeded])

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentView.view])

  if (loading) {
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
        return <HomeView products={products} />
      case 'products':
        return <ProductsView products={products} />
      case 'product-detail':
        return <ProductDetailView products={products} />
      case 'cart':
        return <CartView />
      case 'checkout':
        return <CheckoutView />
      case 'admin':
        return <AdminDashboard />
      case 'admin-products':
        return <AdminProducts products={products} />
      case 'admin-orders':
        return <AdminOrders />
      default:
        return <HomeView products={products} />
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
