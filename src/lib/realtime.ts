import { io, Socket } from 'socket.io-client'

let socketInstance: Socket | null = null

export function getSocket(): Socket {
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
      console.log('[Realtime] Connected to product sync service')
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
  if (socket.connected) {
    socket.emit('product:changed', { action, productId })
    console.log(`[Realtime] Emitted product:${action}`)
  } else {
    console.warn('[Realtime] Socket not connected, skipping emit')
  }
}
