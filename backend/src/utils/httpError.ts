export class HttpError extends Error {
  statusCode: number
  errors: string[]

  constructor(statusCode: number, message: string, errors: string[] = []) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.errors = errors
  }
}

export const badRequest = (message: string, errors: string[] = []) => new HttpError(400, message, errors)
export const unauthorized = (message = 'Unauthorized') => new HttpError(401, message)
export const forbidden = (message = 'Forbidden') => new HttpError(403, message)
export const notFound = (message = 'Not found') => new HttpError(404, message)
export const conflict = (message: string, errors: string[] = []) => new HttpError(409, message, errors)
export const unprocessable = (message: string, errors: string[] = []) => new HttpError(422, message, errors)