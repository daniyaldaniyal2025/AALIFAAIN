import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()

const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  serveClient: false,
})

io.on('connection', (socket) => {
  console.log(`[Connect] Client ${socket.id} (total: ${io.engine.clientsCount})`)

  // When any client (e.g., admin frontend) emits a product change event,
  // broadcast it to ALL connected clients (including the sender)
  socket.on('product:changed', (data: { action: string; productId?: string }) => {
    console.log(`[Product Changed] ${data.action} - from ${socket.id}`)
    io.emit('product:changed', data) // Broadcast to all clients
  })

  socket.on('disconnect', (reason) => {
    console.log(`[Disconnect] Client ${socket.id}: ${reason}`)
  })

  socket.on('error', (error) => {
    console.error(`[Error] Socket ${socket.id}:`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[Realtime Service] Running on port ${PORT}`)
  console.log(`[Realtime Service] Listening for 'product:changed' events`)
})

process.on('SIGTERM', () => {
  io.close()
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  io.close()
  httpServer.close(() => process.exit(0))
})
