import User from '../models/User.js'
import { asyncHandler } from '../middleware/errorHandler.js'

// GET /api/customer/profile
export const getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user })
})

// PATCH /api/customer/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body
  const user = await User.findById(req.user._id)

  if (email) {
    const normalizedEmail = String(email).trim().toLowerCase()
    if (normalizedEmail !== user.email) {
      const existing = await User.findOne({ email: normalizedEmail })
      if (existing) {
        return res.status(409).json({ success: false, message: 'This email is already in use.' })
      }
      user.email = normalizedEmail
    }
  }
  if (name) user.name = name.trim()
  if (phone !== undefined) user.phone = phone ? String(phone).trim() : undefined

  await user.save()
  res.json({ success: true, message: 'Profile updated.', user })
})

// GET /api/customer/addresses
export const getAddresses = asyncHandler(async (req, res) => {
  res.json({ success: true, addresses: req.user.addresses })
})

// POST /api/customer/addresses
export const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  const address = { ...req.body }

  if (address.isDefault || user.addresses.length === 0) {
    user.addresses.forEach((a) => { a.isDefault = false })
    address.isDefault = true
  }

  user.addresses.push(address)
  await user.save()
  res.status(201).json({ success: true, message: 'Address added.', addresses: user.addresses })
})

// PUT /api/customer/addresses/:id
export const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  const address = user.addresses.id(req.params.id)
  if (!address) {
    return res.status(404).json({ success: false, message: 'Address not found.' })
  }

  Object.assign(address, req.body)
  if (req.body.isDefault) {
    user.addresses.forEach((a) => { if (String(a._id) !== req.params.id) a.isDefault = false })
  }

  await user.save()
  res.json({ success: true, message: 'Address updated.', addresses: user.addresses })
})

// DELETE /api/customer/addresses/:id
export const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  const address = user.addresses.id(req.params.id)
  if (!address) {
    return res.status(404).json({ success: false, message: 'Address not found.' })
  }

  const wasDefault = address.isDefault
  address.deleteOne()
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true
  }

  await user.save()
  res.json({ success: true, message: 'Address deleted.', addresses: user.addresses })
})

// POST /api/customer/addresses/:id/default
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  const address = user.addresses.id(req.params.id)
  if (!address) {
    return res.status(404).json({ success: false, message: 'Address not found.' })
  }

  user.addresses.forEach((a) => { a.isDefault = String(a._id) === req.params.id })
  await user.save()
  res.json({ success: true, message: 'Default address updated.', addresses: user.addresses })
})
