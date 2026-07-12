import mongoose from 'mongoose'

const globalForMongo = globalThis as unknown as {
  mongoosePromise?: Promise<typeof mongoose>
}

export async function connectMongo() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    throw new Error('MONGO_URI is not set')
  }

  if (mongoose.connection.readyState >= 1) {
    return mongoose
  }

  if (!globalForMongo.mongoosePromise) {
    globalForMongo.mongoosePromise = mongoose.connect(uri, {
      bufferCommands: false,
    })
  }

  await globalForMongo.mongoosePromise
  return mongoose
}
