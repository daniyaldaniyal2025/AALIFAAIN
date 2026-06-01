import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'

const FULL_PERMISSIONS = JSON.stringify({
  products: { view: true, add: true, edit: true, delete: true },
  categories: { view: true, add: true, edit: true, delete: true },
  orders: { view: true, edit: true, delete: true },
  staff: { view: true, add: true, edit: true, delete: true },
})

export async function GET() {
  try {
    // Check if already seeded
    const count = await db.product.count()
    if (count > 0) {
      // Ensure admin user exists with correct password hash
      const adminExists = await db.user.findUnique({ where: { email: 'admin@alifaain.com' } })
      if (!adminExists) {
        const hashedPassword = hashPassword('admin123')
        await db.user.create({
          data: {
            name: 'Admin',
            email: 'admin@alifaain.com',
            password: hashedPassword,
            role: 'admin',
            adminRole: 'super_admin',
            permissions: FULL_PERMISSIONS,
          },
        })
      } else {
        // Fix admin password if it was hashed with bcrypt (old bug)
        // Custom hash format is: salt:hash (no $2b$ prefix)
        if (adminExists.password.startsWith('$2b$') || adminExists.password.startsWith('$2a$')) {
          const hashedPassword = hashPassword('admin123')
          await db.user.update({
            where: { id: adminExists.id },
            data: { password: hashedPassword },
          })
        }
        // Ensure admin has super_admin role and full permissions
        if (adminExists.adminRole !== 'super_admin') {
          await db.user.update({
            where: { id: adminExists.id },
            data: { adminRole: 'super_admin', permissions: FULL_PERMISSIONS },
          })
        }
      }

      // Also ensure a demo customer exists
      const customerExists = await db.user.findUnique({ where: { email: 'customer@alifaain.com' } })
      if (!customerExists) {
        const hashedPassword = hashPassword('customer123')
        await db.user.create({
          data: {
            name: 'Demo Customer',
            email: 'customer@alifaain.com',
            password: hashedPassword,
            role: 'customer',
          },
        })
      }

      return Response.json({ message: 'Database already seeded', count })
    }

    // Create categories
    const morocco = await db.category.create({
      data: {
        name: 'Morocco',
        slug: 'morocco',
        description: 'Traditional Moroccan beauty products - natural, authentic, and time-tested',
        image: '/images/categories/morocco.png',
      },
    })

    const korea = await db.category.create({
      data: {
        name: 'Korea',
        slug: 'korea',
        description: 'Premium Korean skincare - innovative formulas for radiant skin',
        image: '/images/categories/korea.png',
      },
    })

    const supplements = await db.category.create({
      data: {
        name: 'Supplements',
        slug: 'supplements',
        description: 'Health & wellness supplements for inner beauty',
        image: '/images/categories/supplements.png',
      },
    })

    const clothing = await db.category.create({
      data: {
        name: 'Clothing',
        slug: 'clothing',
        description: 'Coming Soon - Premium fashion collection',
        image: '/images/categories/clothing.png',
        status: 'coming_soon',
      },
    })

    const fragrances = await db.category.create({
      data: {
        name: 'Fragrances',
        slug: 'fragrances',
        description: 'Coming Soon - Exquisite fragrances',
        image: '/images/categories/fragrances.png',
        status: 'coming_soon',
      },
    })

    // Morocco products
    const moroccoProducts = [
      { name: 'Beldi Soap', price: 45, description: 'Traditional Moroccan black soap made from olives, perfect for deep cleansing and exfoliation.', featured: true, discount: 10, image: '/images/products/morocco/beldi-soap.png' },
      { name: 'Kessa Glove', price: 25, description: 'Authentic Moroccan exfoliating glove for smooth, glowing skin.', featured: false, discount: 0, image: '/images/products/morocco/kessa-glove.png' },
      { name: 'Kessa for Back', price: 35, description: 'Long-handled exfoliating glove designed specifically for hard-to-reach back areas.', featured: false, discount: 5, image: '/images/products/morocco/kessa-for-back.png' },
      { name: 'Tbrima Powder', price: 55, description: 'Natural Tbrima powder for traditional Moroccan beauty rituals.', featured: false, discount: 0, image: '/images/products/morocco/tbrima-powder.png' },
      { name: 'Ghassoul Clay', price: 65, description: 'Pure Moroccan Rhassoul clay for deep cleansing hair and skin treatment.', featured: true, discount: 15, image: '/images/products/morocco/ghassoul-clay.png' },
      { name: 'Nila Powder', price: 75, description: 'Authentic Moroccan Nila powder for brightening and evening skin tone.', featured: true, discount: 20, image: '/images/products/morocco/nila-powder.png' },
      { name: 'Aker Fassi', price: 50, description: 'Traditional Moroccan Aker Fassi lipstick and blush - natural beauty color.', featured: false, discount: 0, image: '/images/products/morocco/aker-fassi.png' },
      { name: "Feet Clay M'hekka", price: 40, description: 'Specialized Moroccan clay for foot care and softening rough skin.', featured: false, discount: 10, image: '/images/products/morocco/feet-clay-mhekka.png' },
      { name: "Face M'hekka", price: 45, description: 'Traditional Moroccan face mask tool for even product application.', featured: false, discount: 0, image: '/images/products/morocco/face-mhekka.png' },
      { name: 'Nila Face Mask', price: 55, description: 'Pre-made Nila face mask for instant brightening and rejuvenation.', featured: true, discount: 25, image: '/images/products/morocco/nila-face-mask.png' },
      { name: 'Charcoal Face Mask', price: 50, description: 'Activated charcoal face mask for deep pore cleansing and detox.', featured: false, discount: 15, image: '/images/products/morocco/charcoal-face-mask.png' },
      { name: 'Snail and Shell Face Mask', price: 60, description: 'Unique snail mucin face mask for hydration and repair.', featured: false, discount: 0, image: '/images/products/morocco/snail-shell-face-mask.png' },
      { name: 'Nila Soap Bar', price: 30, description: 'Handcrafted Nila soap bar for daily brightening cleansing.', featured: false, discount: 10, image: '/images/products/morocco/nila-soap-bar.png' },
      { name: 'Donkey Milk Soap Bar', price: 40, description: 'Premium donkey milk soap for moisturizing and anti-aging benefits.', featured: true, discount: 20, image: '/images/products/morocco/donkey-milk-soap-bar.png' },
      { name: 'Goat Milk Soap Bar', price: 35, description: 'Gentle goat milk soap for sensitive and dry skin.', featured: false, discount: 0, image: '/images/products/morocco/goat-milk-soap-bar.png' },
      { name: 'Camel Milk Soap Bar', price: 45, description: 'Luxurious camel milk soap rich in natural vitamins and minerals.', featured: false, discount: 5, image: '/images/products/morocco/camel-milk-soap-bar.png' },
      { name: 'Argan Oil', price: 120, description: 'Pure Moroccan Argan oil - liquid gold for hair and skin nourishment.', featured: true, discount: 30, image: '/images/products/morocco/argan-oil.png' },
      { name: 'Prickly Pear Oil', price: 180, description: 'Rare and precious prickly pear seed oil for premium anti-aging care.', featured: true, discount: 15, image: '/images/products/morocco/prickly-pear-oil.png' },
      { name: 'Sidr Powder', price: 40, description: 'Natural Sidr powder for hair cleansing and conditioning.', featured: false, discount: 0, image: '/images/products/morocco/sidr-powder.png' },
    ]

    for (const product of moroccoProducts) {
      await db.product.create({
        data: {
          name: product.name,
          slug: product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          description: product.description,
          price: product.price,
          categoryId: morocco.id,
          featured: product.featured,
          discount: product.discount || 0,
          stock: Math.floor(Math.random() * 200) + 50,
          image: product.image,
        },
      })
    }

    // Korea products
    const koreaProducts = [
      { name: 'Skin 1004 Centella Ampoule', price: 95, description: 'Concentrated centella asiatica ampoule for soothing and calming irritated skin.', featured: true, discount: 15, image: '/images/products/korea/skin1004-centella-ampoule.png' },
      { name: 'Skin 1004 Centella Toning Toner', price: 75, description: 'Gentle toning toner infused with centella for balanced, refreshed skin.', featured: false, discount: 0, image: '/images/products/korea/skin1004-centella-toning-toner.png' },
      { name: 'Skin 1004 Centella Ampoule Foam', price: 65, description: 'Low-pH cleansing foam with centella for gentle daily cleansing.', featured: false, discount: 10, image: '/images/products/korea/skin1004-centella-ampoule-foam.png' },
      { name: 'Skin 1004 Hyalu-Cica Water-Fit Sun Serum', price: 110, description: 'Lightweight sun serum with hyaluronic acid and centella for perfect UV protection.', featured: true, discount: 20, image: '/images/products/korea/skin1004-hyalu-cica-sun-serum.png' },
      { name: 'Skin 1004 Hyalu-Cica Brightening Toner', price: 85, description: 'Brightening toner combining hyaluronic acid and centella for luminous skin.', featured: false, discount: 0, image: '/images/products/korea/skin1004-hyalu-cica-brightening-toner.png' },
      { name: 'Skin 1004 Probio-Cica Intensive Ampoule', price: 120, description: 'Intensive ampoule with probiotics and centella for skin barrier repair.', featured: true, discount: 25, image: '/images/products/korea/skin1004-probio-cica-ampoule.png' },
      { name: 'Skin 1004 Centella Tea-Trica Purifying Toner', price: 80, description: 'Purifying toner with tea tree and centella for acne-prone skin.', featured: false, discount: 5, image: '/images/products/korea/skin1004-tea-trica-toner.png' },
      { name: 'Skin 1004 Centella Poremizing Fresh Ampoule', price: 95, description: 'Pore-minimizing ampoule for smooth, refined skin texture.', featured: false, discount: 0, image: '/images/products/korea/skin1004-poremizing-ampoule.png' },
      { name: 'Skin 1004 Centella Tone Brightening Capsule Ampoule', price: 105, description: 'Brightening capsule ampoule for even, radiant complexion.', featured: true, discount: 15, image: '/images/products/korea/skin1004-brightening-capsule-ampoule.png' },
      { name: 'Skin 1004 Centella Madagascar Travel Kit', price: 55, description: 'Complete travel-size skincare kit with centella essentials.', featured: false, discount: 10, image: '/images/products/korea/skin1004-travel-kit.png' },
      { name: 'Skin 1004 Centella Ampoule Kit', price: 140, description: 'Full-size ampoule skincare set for comprehensive centella care.', featured: false, discount: 20, image: '/images/products/korea/skin1004-ampoule-kit.png' },
      { name: 'Skin 1004 Centella Air-Fit Suncream Light', price: 90, description: 'Ultra-lightweight suncream that feels like air on skin.', featured: false, discount: 0, image: '/images/products/korea/skin1004-air-fit-suncream.png' },
      { name: 'Skin 1004 Centella Hyalu-Cica Silky-Fit Sun Stick', price: 100, description: 'Convenient sun stick for easy, on-the-go UV protection.', featured: false, discount: 5, image: '/images/products/korea/skin1004-sun-stick.png' },
      { name: 'Skin 1004 Niacinamide 10 Boosting Shot Ampoule', price: 115, description: 'High-concentration niacinamide ampoule for brightening and pore care.', featured: true, discount: 20, image: '/images/products/korea/skin1004-niacinamide-ampoule.png' },
      { name: 'Skin 1004 Retinol 0.2 Boosting Shot Ampoule', price: 125, description: 'Gentle retinol ampoule for anti-aging and skin renewal.', featured: true, discount: 15, image: '/images/products/korea/skin1004-retinol-ampoule.png' },
      { name: 'Skin 1004 Centella Poremizing Light Gel Cream', price: 85, description: 'Lightweight gel cream moisturizer for oily and combination skin.', featured: false, discount: 0, image: '/images/products/korea/skin1004-poremizing-gel-cream.png' },
      { name: 'Dr. Althea 345 Relief Cream', price: 110, description: 'Multi-action relief cream for soothing and repairing damaged skin.', featured: true, discount: 25, image: '/images/products/korea/dr-althea-345-relief-cream.png' },
      { name: 'Dr. Althea 147 Barrier Cream', price: 105, description: 'Skin barrier strengthening cream for resilient, healthy skin.', featured: false, discount: 10, image: '/images/products/korea/dr-althea-147-barrier-cream.png' },
      { name: 'Dr. Althea Aqua Marine Watery Cream', price: 95, description: 'Deep hydration cream with marine ingredients for plump, dewy skin.', featured: false, discount: 0, image: '/images/products/korea/dr-althea-aqua-marine-cream.png' },
      { name: 'Dr. Althea Pure Grinding Cleansing Balm', price: 75, description: 'Innovative grinding cleansing balm for effective makeup removal.', featured: false, discount: 15, image: '/images/products/korea/dr-althea-cleansing-balm.png' },
      { name: 'Dr. Althea PDRN Reju Cream', price: 135, description: 'Premium PDRN rejuvenation cream for advanced anti-aging care.', featured: true, discount: 20, image: '/images/products/korea/dr-althea-pdrn-reju-cream.png' },
      { name: 'Dr. Althea Gentle Vitamin C Serum', price: 100, description: 'Gentle yet effective vitamin C serum for brightening and antioxidant protection.', featured: false, discount: 10, image: '/images/products/korea/dr-althea-vitamin-c-serum.png' },
      { name: 'Dr. Althea Skin Relief Essence', price: 90, description: 'Calming essence for immediate skin relief and comfort.', featured: false, discount: 0, image: '/images/products/korea/dr-althea-skin-relief-essence.png' },
    ]

    for (const product of koreaProducts) {
      await db.product.create({
        data: {
          name: product.name,
          slug: product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          description: product.description,
          price: product.price,
          categoryId: korea.id,
          featured: product.featured,
          discount: product.discount || 0,
          stock: Math.floor(Math.random() * 200) + 50,
          image: product.image,
        },
      })
    }

    // Supplements products
    const supplementProducts = [
      { name: 'Feel Great Bulk Pack - 30 Days', price: 299, description: 'Complete 30-day wellness supplement pack for overall health and vitality.', featured: true, discount: 20, image: '/images/products/supplements/feel-great-bulk-pack.png' },
      { name: 'Shilajit', price: 199, description: 'Premium natural Shilajit resin for energy, strength, and rejuvenation.', featured: true, discount: 15, image: '/images/products/supplements/shilajit.png' },
    ]

    for (const product of supplementProducts) {
      await db.product.create({
        data: {
          name: product.name,
          slug: product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          description: product.description,
          price: product.price,
          categoryId: supplements.id,
          featured: product.featured,
          discount: product.discount || 0,
          stock: Math.floor(Math.random() * 100) + 30,
          image: product.image,
        },
      })
    }

    // Create some sample orders
    const allProducts = await db.product.findMany({ take: 5 })
    for (let i = 0; i < 8; i++) {
      const product = allProducts[i % allProducts.length]
      const statuses = ['pending', 'processing', 'shipped', 'delivered']
      await db.order.create({
        data: {
          customerName: `Customer ${i + 1}`,
          customerEmail: `customer${i + 1}@example.com`,
          customerPhone: `+9665${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
          total: product.price * (i % 3 + 1),
          status: statuses[i % 4],
          currency: 'SAR',
          country: 'SA',
          items: {
            create: {
              productId: product.id,
              name: product.name,
              price: product.price,
              quantity: i % 3 + 1,
            },
          },
        },
      })
    }

    // Create admin user
    const adminExists = await db.user.findUnique({ where: { email: 'admin@alifaain.com' } })
    if (!adminExists) {
      const hashedPassword = hashPassword('admin123')
      await db.user.create({
        data: {
          name: 'Admin',
          email: 'admin@alifaain.com',
          password: hashedPassword,
          role: 'admin',
          adminRole: 'super_admin',
          permissions: FULL_PERMISSIONS,
        },
      })
    }

    // Create demo customer user
    const customerExists = await db.user.findUnique({ where: { email: 'customer@alifaain.com' } })
    if (!customerExists) {
      const hashedPassword = hashPassword('customer123')
      await db.user.create({
        data: {
          name: 'Demo Customer',
          email: 'customer@alifaain.com',
          password: hashedPassword,
          role: 'customer',
        },
      })
    }

    const finalCount = await db.product.count()
    return Response.json({ message: 'Database seeded successfully', products: finalCount })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Failed to seed database' }, { status: 500 })
  }
}
