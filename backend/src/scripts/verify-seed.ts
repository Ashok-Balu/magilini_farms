import { connectDatabase, disconnectDatabase } from '../config/database.js'
import Category from '../models/Category.js'
import Product from '../models/Product.js'
import config from '../config/env.js'

const run = async () => {
  try {
    await connectDatabase()

    const categories = await Category.find({}, { slug: 1, name: 1 })
    console.log(`Environment: ${config.nodeEnv}, Database: ${config.dbName}`)

    for (const cat of categories) {
      const count = await Product.countDocuments({ category: cat._id })
      console.log(`Category: ${cat.name} (${cat.slug}) -> ${count} products`)
    }

    const total = await Product.countDocuments()
    console.log(`Total products: ${total}`)
  } catch (err) {
    console.error('Verification failed', err)
  } finally {
    await disconnectDatabase()
  }
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
