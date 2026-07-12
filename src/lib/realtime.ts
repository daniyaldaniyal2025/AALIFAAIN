import { io, Socket } from 'socket.io-client'

let socketInstance: Socket | null = null

/** Realtime sync is optional and only works with the local/transform socket proxy. */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null

  // Skip on hosts that cannot proxy XTransformPort (Vercel, Render, etc.)
  if (process.env.NEXT_PUBLIC_ENABLE_REALTIME !== 'true') {
    return null
  }

  if (!socketInstance) {
    socketInstance = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    })

    socketInstance.on('connect', () => {
      console.log('[Realtime] Connected to sync service')
    })

    socketInstance.on('disconnect', (reason) => {
      console.log('[Realtime] Disconnected:', reason)
    })
  }
  return socketInstance
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}

// Emit a product change event to all connected clients
export function emitProductChange(action: 'created' | 'updated' | 'deleted', productId?: string) {
  const socket = getSocket()
  if (socket?.connected) {
    socket.emit('product:changed', { action, productId })
    console.log(`[Realtime] Emitted product:${action}`)
  }
}

// Emit a category change event to all connected clients
export function emitCategoryChange(action: 'created' | 'updated' | 'deleted', categoryId?: string) {
  const socket = getSocket()
  if (socket?.connected) {
    socket.emit('category:changed', { action, categoryId })
    console.log(`[Realtime] Emitted category:${action}`)
  }
}
