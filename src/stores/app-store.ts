import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { trackEvent } from '@/lib/analytics'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  image?: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          trackEvent('add_to_cart', 'products', { meta: item.productId })
          const existing = state.items.find((i) => i.productId === item.productId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            }
          }
          return { items: [...state.items, item] }
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
        })),
      clearCart: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    { name: 'alifaain-cart' }
  )
)

interface WishlistItem {
  productId: string
  name: string
  price: number
  image?: string
}

interface WishlistStore {
  items: WishlistItem[]
  addItem: (item: WishlistItem) => void
  removeItem: (productId: string) => void
  toggleItem: (item: WishlistItem) => boolean
  isInWishlist: (productId: string) => boolean
  clearWishlist: () => void
  totalItems: () => number
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          if (state.items.some((i) => i.productId === item.productId)) return state
          return { items: [...state.items, item] }
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      toggleItem: (item) => {
        const exists = get().items.some((i) => i.productId === item.productId)
        if (exists) {
          set((state) => ({
            items: state.items.filter((i) => i.productId !== item.productId),
          }))
          return false
        }
        set((state) => ({ items: [...state.items, item] }))
        return true
      },
      isInWishlist: (productId) => get().items.some((i) => i.productId === productId),
      clearWishlist: () => set({ items: [] }),
      totalItems: () => get().items.length,
    }),
    { name: 'alifaain-wishlist' }
  )
)

export interface AppliedCoupon {
  code: string
  discountAmount: number
  discountType: 'percent' | 'fixed'
  discountValue: number
  description?: string | null
}

interface CouponStore {
  applied: AppliedCoupon | null
  setApplied: (coupon: AppliedCoupon) => void
  clearApplied: () => void
}

export const useCouponStore = create<CouponStore>()(
  persist(
    (set) => ({
      applied: null,
      setApplied: (coupon) => set({ applied: coupon }),
      clearApplied: () => set({ applied: null }),
    }),
    { name: 'alifaain-coupon' }
  )
)

interface AppView {
  view: 'home' | 'products' | 'product-detail' | 'cart' | 'wishlist' | 'checkout' | 'admin' | 'admin-products' | 'admin-orders' | 'admin-categories' | 'admin-staff' | 'signin' | 'signup' | 'profile' | 'about' | 'contact'
  params?: Record<string, string>
}

interface AppStore {
  currentView: AppView
  setView: (view: AppView) => void
  selectedCountry: string
  setSelectedCountry: (country: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCategory: string | null
  setSelectedCategory: (category: string | null) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      currentView: { view: 'home' },
      setView: (view) => set({ currentView: view }),
      selectedCountry: 'SA',
      setSelectedCountry: (country) => set({ selectedCountry: country }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      selectedCategory: null,
      setSelectedCategory: (category) => set({ selectedCategory: category }),
    }),
    {
      name: 'alifaain-app',
      partialize: (state) => ({
        selectedCountry: state.selectedCountry,
      }),
    }
  )
)
