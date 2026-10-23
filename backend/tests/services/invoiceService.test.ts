import assert from 'node:assert/strict'
import test from 'node:test'
import { generateInvoicePDF } from '../../src/services/invoiceService.js'

const order = {
  orderNumber: 'NM-000101',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  customer: { name: 'Sam Customer', phone: '9876543210' },
  items: [{ name: 'Alphonso Mango', weight: '1 kg', qty: 2, price: 250, subtotal: 500 }],
  subtotal: 500,
  couponCode: 'SAVE15',
  couponDiscount: 50,
  taxAmount: 22.5,
  taxLabel: 'GST',
  packagingFee: 20,
  deliveryFee: 80,
  total: 572.5,
  paymentMethod: 'razorpay-upi',
  paymentStatus: 'paid'
}

test('invoice service generates valid PDFs for delivery and pickup orders', async () => {
  const deliveryPdf = await generateInvoicePDF({
    ...order,
    deliveryType: 'home',
    deliveryAddress: {
      line1: '1 Farm Road',
      line2: 'Near Market',
      city: 'Salem',
      state: 'Tamil Nadu',
      pincode: '636001'
    }
  })
  const pickupPdf = await generateInvoicePDF({
    ...order,
    deliveryType: 'pickup',
    pickupDate: new Date('2026-01-05T00:00:00.000Z')
  })

  for (const pdf of [deliveryPdf, pickupPdf]) {
    assert.ok(Buffer.isBuffer(pdf))
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
    assert.ok(pdf.length > 1000)
  }
})
