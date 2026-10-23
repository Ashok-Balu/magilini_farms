import PDFDocument from 'pdfkit'
import fs from 'fs'

export const generateInvoicePDF = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc    = new PDFDocument({ margin: 50, size: 'A4' })
      const chunks = []
      doc.on('data',  chunk => chunks.push(chunk))
      doc.on('end',   ()    => resolve(Buffer.concat(chunks)))
      doc.on('error', err   => reject(err))

      const GREEN  = '#1B4D2E'
      const MANGO  = '#F59E0B'
      const MUTED  = '#6B7280'
      const W      = doc.page.width - 100

      // ── HEADER ──────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 120).fill(GREEN)
         const logoPath = process.env.INVOICE_LOGO_PATH
         if (logoPath && fs.existsSync(logoPath)) {
            try {
               doc.image(logoPath, 50, 24, { width: 48, height: 48 })
            } catch {
               // Ignore logo rendering failures and keep invoice generation resilient.
            }
         }
      doc.fillColor('#fff').fontSize(24).font('Helvetica-Bold')
             .text('MagiliniFarms', logoPath ? 108 : 50, 35)
      doc.fontSize(10).font('Helvetica')
             .text('Farm Fresh, Delivered', logoPath ? 108 : 50, 65)
             .text(`${process.env.FARM_ADDRESS || 'Salem, Tamil Nadu'}`, 50, 80)
             .text(`+91 ${process.env.ADMIN_WA_NUMBER?.replace('91','')}  |  ${process.env.EMAIL_USER || ''}`, 50, 95)

      // Invoice label
      doc.fillColor(MANGO).fontSize(14).font('Helvetica-Bold')
         .text('INVOICE', 400, 40, { align: 'right', width: 150 })
      doc.fillColor('#fff').fontSize(9).font('Helvetica')
         .text(`Invoice No: INV-${order.orderNumber}`, 350, 60, { align: 'right', width: 200 })
         .text(`Order No: ${order.orderNumber}`,       350, 75, { align: 'right', width: 200 })
         .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 350, 90, { align: 'right', width: 200 })
         .text(`Status: ${String(order.paymentStatus || 'pending').toUpperCase()}`, 350, 105, { align: 'right', width: 200 })

      // ── BILL TO ──────────────────────────────────────────
      doc.moveDown(2)
      doc.fillColor(GREEN).fontSize(10).font('Helvetica-Bold').text('BILL TO:')
      doc.fillColor('#111').fontSize(10).font('Helvetica')
         .text(order.customer.name)
         .text(order.customer.phone)
      if (order.deliveryType === 'home' && order.deliveryAddress) {
        const a = order.deliveryAddress
        doc.text(`${a.line1}${a.line2 ? ', ' + a.line2 : ''}`)
           .text(`${a.city}, ${a.state} — ${a.pincode}`)
      } else {
        doc.text('Farm Pickup')
           .text(`Pickup Date: ${order.pickupDate ? new Date(order.pickupDate).toLocaleDateString('en-IN') : 'N/A'}`)
      }

      // ── ITEMS TABLE ──────────────────────────────────────
      doc.moveDown(1.5)
      const tableTop = doc.y

      // Header row
      doc.rect(50, tableTop, W, 22).fill(GREEN)
      doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
      doc.text('Item',      60,  tableTop + 7, { width: 200 })
         .text('Weight',    260, tableTop + 7, { width: 70 })
         .text('Qty',       330, tableTop + 7, { width: 50 })
         .text('Price',     380, tableTop + 7, { width: 70 })
         .text('Total',     450, tableTop + 7, { width: 80, align: 'right' })

      // Items
      let y = tableTop + 28
      doc.font('Helvetica').fontSize(9)
      order.items.forEach((item, i) => {
        const bg = i % 2 === 0 ? '#F9FAFB' : '#FFFFFF'
        doc.rect(50, y - 4, W, 20).fill(bg)
        doc.fillColor('#111')
           .text(item.name,              60,  y, { width: 200 })
           .text(item.weight,            260, y, { width: 70 })
           .text(String(item.qty),       330, y, { width: 50 })
           .text(`₹${item.price}`,       380, y, { width: 70 })
           .text(`₹${item.subtotal}`,    450, y, { width: 80, align: 'right' })
        y += 22
      })

      // ── TOTALS ───────────────────────────────────────────
      doc.moveTo(50, y + 5).lineTo(50 + W, y + 5).strokeColor('#E5E7EB').stroke()
      y += 15

      const addRow = (label, value, bold = false, color = '#111') => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
           .fillColor(MUTED).text(label, 350, y, { width: 100 })
           .fillColor(color).text(value, 450, y, { width: 80, align: 'right' })
        y += 18
      }

      const taxableAmount = Math.max(0, Number(order.subtotal || 0) - Number(order.couponDiscount || 0))
      const taxAmount = Number(order.taxAmount || 0)
      const taxLabel = order.taxLabel || 'Taxes'

      addRow('Subtotal',     `₹${order.subtotal}`)
      if (order.couponDiscount) addRow(`Coupon (${order.couponCode})`, `-₹${order.couponDiscount}`, false, '#16A34A')
      addRow('Taxable Amount', `₹${taxableAmount}`)
      addRow(taxLabel, `₹${taxAmount}`)
      if (order.packagingFee)   addRow('Gift Packing', `₹${order.packagingFee}`)
      addRow('Delivery Fee', order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`)
      doc.moveTo(350, y).lineTo(530, y).strokeColor('#E5E7EB').stroke()
      y += 8
      addRow(order.paymentStatus === 'paid' ? 'TOTAL PAID' : 'TOTAL', `₹${order.total}`, true, GREEN)

      // Payment method
      doc.fillColor(MUTED).fontSize(8).text(`Payment: ${order.paymentMethod} — ${order.paymentStatus.toUpperCase()}`, 50, y + 10)

      // ── FOOTER ───────────────────────────────────────────
      doc.rect(0, doc.page.height - 60, doc.page.width, 60).fill(GREEN)
      doc.fillColor('#fff').fontSize(8).font('Helvetica')
         .text('Thank you for your order! For any queries, contact us on WhatsApp.', 50, doc.page.height - 45, { align: 'center', width: W })
         .text(`wa.me/${process.env.ADMIN_WA_NUMBER}  |  ${process.env.FRONTEND_URL}`, 50, doc.page.height - 30, { align: 'center', width: W })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

