import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

interface AppView {
  view: 'home' | 'products' | 'product-detail' | 'cart' | 'checkout' | 'admin' | 'admin-products' | 'admin-orders' | 'signin' | 'signup' | 'profile'
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
