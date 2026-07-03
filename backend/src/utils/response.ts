type JsonObject = Record<string, unknown>

export const successResponse = (
  message = 'OK',
  data: JsonObject = {},
  extra: JsonObject = {}
): JsonObject => ({ success: true, message, data, ...extra })

export const errorResponse = (
  message = 'Request failed',
  errors: string[] = [],
  extra: JsonObject = {}
): JsonObject => ({ success: false, message, errors, ...extra })
