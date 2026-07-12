import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

function getModel<T>(name: string, schema: Schema): Model<T> {
  return (models[name] as Model<T>) || model<T>(name, schema)
}

const categorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    image: String,
    status: { type: String, default: 'active' },
  },
  { timestamps: true, collection: 'Category' },
)

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    price: { type: Number, required: true },
    image: String,
    images: { type: String, default: '[]' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    featured: { type: Boolean, default: false },
    discount: { type: Number, default: 0 },
    stock: { type: Number, default: 100 },
    status: { type: String, default: 'active' },
  },
  { timestamps: true, collection: 'Product' },
)

const orderSchema = new Schema(
  {
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: String,
    total: { type: Number, required: true },
    couponCode: String,
    discountAmount: { type: Number, default: 0 },
    status: { type: String, default: 'pending' },
    currency: { type: String, default: 'SAR' },
    country: { type: String, default: 'SA' },
    paymentMethod: { type: String, default: 'cod' },
    paymentStatus: { type: String, default: 'pending' },
    transactionId: String,
    cardLast4: String,
    paidAt: Date,
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'Order' },
)

const orderItemSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { timestamps: false, collection: 'OrderItem' },
)

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, index: true },
    password: { type: String, required: true },
    image: String,
    role: { type: String, default: 'customer' },
    adminRole: { type: String, default: 'sub_admin' },
    permissions: { type: String, default: '{}' },
    emailVerified: Date,
  },
  { timestamps: true, collection: 'User' },
)

const accountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    refresh_token: String,
    access_token: String,
    expires_at: Number,
    token_type: String,
    scope: String,
    id_token: String,
    session_state: String,
  },
  { timestamps: false, collection: 'Account' },
)

accountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true })

const sessionSchema = new Schema(
  {
    sessionToken: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expires: { type: Date, required: true },
  },
  { timestamps: false, collection: 'Session' },
)

const verificationTokenSchema = new Schema(
  {
    identifier: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    expires: { type: Date, required: true },
  },
  { timestamps: false, collection: 'VerificationToken' },
)

verificationTokenSchema.index({ identifier: 1, token: 1 }, { unique: true })

const siteEventSchema = new Schema(
  {
    type: { type: String, required: true },
    page: { type: String, required: true },
    sessionId: { type: String, required: true, index: true },
    userId: String,
    country: String,
    meta: String,
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'SiteEvent' },
)

siteEventSchema.index({ createdAt: 1 })
siteEventSchema.index({ type: 1, createdAt: 1 })
siteEventSchema.index({ page: 1, createdAt: 1 })

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    description: String,
    discountType: { type: String, default: 'percent' },
    discountValue: { type: Number, required: true },
    minOrderTotal: { type: Number, default: 0 },
    maxUses: Number,
    usedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    expiresAt: Date,
  },
  { timestamps: true, collection: 'Coupon' },
)

export type CategoryDoc = InferSchemaType<typeof categorySchema> & { _id: Schema.Types.ObjectId }
export type ProductDoc = InferSchemaType<typeof productSchema> & { _id: Schema.Types.ObjectId }
export type OrderDoc = InferSchemaType<typeof orderSchema> & { _id: Schema.Types.ObjectId }
export type OrderItemDoc = InferSchemaType<typeof orderItemSchema> & { _id: Schema.Types.ObjectId }
export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Schema.Types.ObjectId }
export type AccountDoc = InferSchemaType<typeof accountSchema> & { _id: Schema.Types.ObjectId }
export type SessionDoc = InferSchemaType<typeof sessionSchema> & { _id: Schema.Types.ObjectId }
export type VerificationTokenDoc = InferSchemaType<typeof verificationTokenSchema> & {
  _id: Schema.Types.ObjectId
}
export type SiteEventDoc = InferSchemaType<typeof siteEventSchema> & { _id: Schema.Types.ObjectId }
export type CouponDoc = InferSchemaType<typeof couponSchema> & { _id: Schema.Types.ObjectId }

export const Category = getModel<CategoryDoc>('Category', categorySchema)
export const Product = getModel<ProductDoc>('Product', productSchema)
export const Order = getModel<OrderDoc>('Order', orderSchema)
export const OrderItem = getModel<OrderItemDoc>('OrderItem', orderItemSchema)
export const User = getModel<UserDoc>('User', userSchema)
export const Account = getModel<AccountDoc>('Account', accountSchema)
export const Session = getModel<SessionDoc>('Session', sessionSchema)
export const VerificationToken = getModel<VerificationTokenDoc>(
  'VerificationToken',
  verificationTokenSchema,
)
export const SiteEvent = getModel<SiteEventDoc>('SiteEvent', siteEventSchema)
export const Coupon = getModel<CouponDoc>('Coupon', couponSchema)
