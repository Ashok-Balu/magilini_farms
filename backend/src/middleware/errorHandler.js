import { HttpError } from '../utils/httpError.js'
import { errorResponse } from '../utils/response.js'
import { logger } from '../utils/logger.js'

// Wrap async route handlers - eliminates try/catch in every controller
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// Global error handler
export const errorHandler = (err, req, res, next) => {
  const fallbackStatus = Number(err?.statusCode || err?.status || 500)
  const statusCode = Number.isInteger(fallbackStatus) ? fallbackStatus : 500

  logger.error('Request failed', {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorName: err?.name,
    errorMessage: err?.message
  })

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json(errorResponse(err.message, err.errors || []))
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message)
    return res.status(422).json(errorResponse('Validation failed', messages))
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(409).json(errorResponse(`${field} already exists.`, [`${field} already exists.`]))
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(errorResponse('Unauthorized', ['Invalid JWT token.']))
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(errorResponse('Unauthorized', ['JWT token has expired.']))
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json(errorResponse('File too large. Max 5MB allowed.', ['File size exceeds 5MB.']))
  }

  if (statusCode === 401) return res.status(401).json(errorResponse('Unauthorized', ['Unauthorized request.']))
  if (statusCode === 403) return res.status(403).json(errorResponse('Forbidden', ['Access denied.']))
  if (statusCode === 404) return res.status(404).json(errorResponse('Not found', ['Requested resource not found.']))

  const publicMessage = statusCode >= 500
    ? 'Internal server error.'
    : (err.message || 'Request failed.')

  return res.status(statusCode).json(errorResponse(publicMessage, []))
}

// 404 handler
export const notFound = (req, res) => {
  res.status(404).json(errorResponse(`Route ${req.originalUrl} not found.`, ['Route not found.']))
}
