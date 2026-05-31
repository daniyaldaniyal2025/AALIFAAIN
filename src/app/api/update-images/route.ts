import { db } from '@/lib/db'

// Product name to image path mapping
const productImageMap: Record<string, string> = {
  // Morocco
  'Beldi Soap': '/images/products/morocco/beldi-soap.png',
  'Kessa Glove': '/images/products/morocco/kessa-glove.png',
  'Kessa for Back': '/images/products/morocco/kessa-for-back.png',
  'Tbrima Powder': '/images/products/morocco/tbrima-powder.png',
  'Ghassoul Clay': '/images/products/morocco/ghassoul-clay.png',
  'Nila Powder': '/images/products/morocco/nila-powder.png',
  'Aker Fassi': '/images/products/morocco/aker-fassi.png',
  "Feet Clay M'hekka": '/images/products/morocco/feet-clay-mhekka.png',
  "Face M'hekka": '/images/products/morocco/face-mhekka.png',
  'Nila Face Mask': '/images/products/morocco/nila-face-mask.png',
  'Charcoal Face Mask': '/images/products/morocco/charcoal-face-mask.png',
  'Snail and Shell Face Mask': '/images/products/morocco/snail-shell-face-mask.png',
  'Nila Soap Bar': '/images/products/morocco/nila-soap-bar.png',
  'Donkey Milk Soap Bar': '/images/products/morocco/donkey-milk-soap-bar.png',
  'Goat Milk Soap Bar': '/images/products/morocco/goat-milk-soap-bar.png',
  'Camel Milk Soap Bar': '/images/products/morocco/camel-milk-soap-bar.png',
  'Argan Oil': '/images/products/morocco/argan-oil.png',
  'Prickly Pear Oil': '/images/products/morocco/prickly-pear-oil.png',
  'Sidr Powder': '/images/products/morocco/sidr-powder.png',
  // Korea - Skin 1004
  'Skin 1004 Centella Ampoule': '/images/products/korea/skin1004-centella-ampoule.png',
  'Skin 1004 Centella Toning Toner': '/images/products/korea/skin1004-centella-toning-toner.png',
  'Skin 1004 Centella Ampoule Foam': '/images/products/korea/skin1004-centella-ampoule-foam.png',
  'Skin 1004 Hyalu-Cica Water-Fit Sun Serum': '/images/products/korea/skin1004-hyalu-cica-sun-serum.png',
  'Skin 1004 Hyalu-Cica Brightening Toner': '/images/products/korea/skin1004-hyalu-cica-brightening-toner.png',
  'Skin 1004 Probio-Cica Intensive Ampoule': '/images/products/korea/skin1004-probio-cica-ampoule.png',
  'Skin 1004 Centella Tea-Trica Purifying Toner': '/images/products/korea/skin1004-tea-trica-toner.png',
  'Skin 1004 Centella Poremizing Fresh Ampoule': '/images/products/korea/skin1004-poremizing-ampoule.png',
  'Skin 1004 Centella Tone Brightening Capsule Ampoule': '/images/products/korea/skin1004-brightening-capsule-ampoule.png',
  'Skin 1004 Centella Madagascar Travel Kit': '/images/products/korea/skin1004-travel-kit.png',
  'Skin 1004 Centella Ampoule Kit': '/images/products/korea/skin1004-ampoule-kit.png',
  'Skin 1004 Centella Air-Fit Suncream Light': '/images/products/korea/skin1004-air-fit-suncream.png',
  'Skin 1004 Centella Hyalu-Cica Silky-Fit Sun Stick': '/images/products/korea/skin1004-sun-stick.png',
  'Skin 1004 Madagascar Centella Niacinamide 10 Boosting Shot Ampoule': '/images/products/korea/skin1004-niacinamide-ampoule.png',
  'Skin 1004 Madagascar Centella Retinol 0.2 Boosting Shot Ampoule': '/images/products/korea/skin1004-retinol-ampoule.png',
  'Skin 1004 Niacinamide 10 Boosting Shot Ampoule': '/images/products/korea/skin1004-niacinamide-ampoule.png',
  'Skin 1004 Retinol 0.2 Boosting Shot Ampoule': '/images/products/korea/skin1004-retinol-ampoule.png',
  'Skin 1004 Centella Poremizing Light Gel Cream': '/images/products/korea/skin1004-poremizing-gel-cream.png',
  // Korea - Dr Althea
  'Dr. Althea 345 Relief Cream': '/images/products/korea/dr-althea-345-relief-cream.png',
  'Dr. Althea 147 Barrier Cream': '/images/products/korea/dr-althea-147-barrier-cream.png',
  'Dr. Althea Aqua Marine Watery Cream': '/images/products/korea/dr-althea-aqua-marine-cream.png',
  'Dr. Althea Pure Grinding Cleansing Balm': '/images/products/korea/dr-althea-cleansing-balm.png',
  'Dr. Althea PDRN Reju Cream': '/images/products/korea/dr-althea-pdrn-reju-cream.png',
  'Dr. Althea Gentle Vitamin C Serum': '/images/products/korea/dr-althea-vitamin-c-serum.png',
  'Dr. Althea Skin Relief Essence': '/images/products/korea/dr-althea-skin-relief-essence.png',
  // Supplements
  'Feel Great Bulk Pack - 30 Days': '/images/products/supplements/feel-great-bulk-pack.png',
  'Shilajit': '/images/products/supplements/shilajit.png',
}

const categoryImageMap: Record<string, string> = {
  'morocco': '/images/categories/morocco.png',
  'korea': '/images/categories/korea.png',
  'supplements': '/images/categories/supplements.png',
  'clothing': '/images/categories/clothing.png',
  'fragrances': '/images/categories/fragrances.png',
}

export async function GET() {
  try {
    let updatedProducts = 0
    let updatedCategories = 0

    for (const [productName, imagePath] of Object.entries(productImageMap)) {
      try {
        const result = await db.product.updateMany({
          where: { name: productName },
          data: { image: imagePath },
        })
        updatedProducts += result.count
      } catch {
        console.error(`Failed to update image for: ${productName}`)
      }
    }

    for (const [slug, imagePath] of Object.entries(categoryImageMap)) {
      try {
        const result = await db.category.updateMany({
          where: { slug },
          data: { image: imagePath },
        })
        updatedCategories += result.count
      } catch {
        console.error(`Failed to update image for category: ${slug}`)
      }
    }

    return Response.json({
      success: true,
      updatedProducts,
      updatedCategories,
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Failed to update images' }, { status: 500 })
  }
}
