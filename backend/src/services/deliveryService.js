import { Pincode } from '../models/index.js'
import { HttpError } from '../utils/httpError.js'

const POSTAL_API_TIMEOUT_MS = 5000
const POSTAL_CACHE_REASON = 'Postal metadata cached; serviceability requires admin approval.'

const ZONE_RULES = [
  {
    key: 'tamil-nadu',
    label: 'Tamil Nadu',
    states: ['Tamil Nadu'],
    deliveryFee: 80,
    estimatedDays: '1-2 Days'
  },
  {
    key: 'south-india',
    label: 'South India',
    states: ['Karnataka', 'Kerala', 'Telangana'],
    deliveryFee: 120,
    estimatedDays: '2-3 Days'
  }
]

const DEFAULT_ZONE = {
  key: 'rest-india',
  label: 'Rest of India',
  deliveryFee: 180,
  estimatedDays: '3-4 Days'
}

export const calculateDeliveryFee = (baseFee, subtotal, freeDeliveryMin = 0) =>
  Number(freeDeliveryMin) > 0 && Number(subtotal) >= Number(freeDeliveryMin) ? 0 : Number(baseFee)

const normalizeStateName = (state) => String(state || '').trim()

const deriveZoneFromState = (state) => {
  const normalized = normalizeStateName(state)
  return ZONE_RULES.find(rule => rule.states.includes(normalized)) || DEFAULT_ZONE
}

const formatZoneLabel = (zoneKey) => {
  const rule = ZONE_RULES.find(item => item.key === zoneKey)
  if (rule) return rule.label
  if (zoneKey === DEFAULT_ZONE.key) return DEFAULT_ZONE.label
  return zoneKey.split(/[-_ ]+/).map(word => word[0]?.toUpperCase() + word.slice(1)).join(' ')
}

const fetchPostalPincodeData = async (pincode) => {
  const url = `https://api.postalpincode.in/pincode/${pincode}`
  let response
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MagiliniFarms/1.0 (+https://magilinifarms.com)'
      },
      signal: AbortSignal.timeout(POSTAL_API_TIMEOUT_MS)
    })
  } catch (error) {
    throw new HttpError(503, error?.name === 'TimeoutError'
      ? 'Postal service timed out. Please try again.'
      : 'Postal service is unavailable. Please try again.')
  }

  if (!response.ok) {
    throw new HttpError(502, 'Unable to resolve pincode from postal service.')
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new HttpError(502, 'Invalid pincode lookup response.')
  }
  if (!Array.isArray(payload) || !payload.length) {
    throw new HttpError(502, 'Invalid pincode lookup response.')
  }

  const result = payload[0]
  if (!result || typeof result.Status !== 'string' || !Array.isArray(result.PostOffice)) {
    throw new HttpError(502, 'Invalid pincode lookup response.')
  }
  if (result.Status !== 'Success' || !result.PostOffice.length) {
    throw new HttpError(404, 'Pincode not found.')
  }

  const office = result.PostOffice.find(item => String(item?.Pincode || '') === pincode) || result.PostOffice[0]
  if (!office || typeof office.State !== 'string' || !office.State.trim()) {
    throw new HttpError(502, 'Postal service returned incomplete pincode metadata.')
  }
  const city = office.Block || office.District || office.Name
  if (typeof city !== 'string' || !city.trim()) {
    throw new HttpError(502, 'Postal service returned incomplete pincode metadata.')
  }
  return {
    pincode,
    city: city.trim(),
    district: office.District || office.Block || office.Name || '',
    state: office.State.trim()
  }
}

export const getDeliveryByPincode = async (pincode) => {
  const normalized = String(pincode || '').trim()
  if (!/^[1-9][0-9]{5}$/.test(normalized)) {
    throw new HttpError(400, 'Pincode must be 6 digits.')
  }

  let pinDoc = await Pincode.findOne({ pincode: normalized })

  if (!pinDoc) {
    const postalData = await fetchPostalPincodeData(normalized)
    const defaultZone = deriveZoneFromState(postalData.state)
    try {
      pinDoc = await Pincode.create({
        pincode: normalized,
        city: postalData.city,
        district: postalData.district,
        state: postalData.state,
        zone: defaultZone.key,
        deliveryFee: defaultZone.deliveryFee,
        estimatedDays: defaultZone.estimatedDays,
        isActive: true,
        isServiceable: false,
        reason: POSTAL_CACHE_REASON,
        priority: 0
      })
    } catch (error) {
      if (error?.code !== 11000) throw error
      pinDoc = await Pincode.findOne({ pincode: normalized })
      if (!pinDoc) throw error
    }
  } else if (pinDoc.reason === 'Auto cached from postalpincode.in' && pinDoc.isServiceable !== false) {
    pinDoc.isServiceable = false
    pinDoc.reason = POSTAL_CACHE_REASON
    await pinDoc.save()
  }

  const zoneInfo = deriveZoneFromState(pinDoc.state)
  const isOverrideActive = pinDoc.isActive !== false
  const serviceable = isOverrideActive && pinDoc.isServiceable === true

  if (!serviceable) {
    const needsApproval = pinDoc.reason === POSTAL_CACHE_REASON
    const reason = pinDoc.reason || (isOverrideActive
      ? 'Delivery is currently unavailable for this pincode.'
      : 'This pincode is not enabled for delivery.')
    return {
      success: true,
      serviceable: false,
      message: needsApproval ? 'Pincode details found; delivery availability is awaiting admin approval.' : reason,
      reason,
      city: pinDoc.city || '',
      district: pinDoc.district || '',
      state: pinDoc.state || ''
    }
  }

  const zoneKey = pinDoc.zone || zoneInfo.key
  const deliveryFee = typeof pinDoc.deliveryFee === 'number' ? pinDoc.deliveryFee : zoneInfo.deliveryFee
  const estimatedDays = pinDoc.estimatedDays || zoneInfo.estimatedDays
  const zoneLabel = formatZoneLabel(zoneKey)

  return {
    success: true,
    serviceable,
    zone: zoneLabel,
    deliveryFee,
    estimatedDays,
    city: pinDoc.city || '',
    district: pinDoc.district || '',
    state: pinDoc.state || ''
  }
}
