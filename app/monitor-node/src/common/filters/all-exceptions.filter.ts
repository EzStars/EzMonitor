import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'

function getMessage(exception: unknown): string {
  if (exception instanceof HttpException) {
    const response = exception.getResponse()
    if (typeof response === 'string') {
      return response
    }

    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message?: unknown }).message
      if (typeof message === 'string') {
        return message
      }
      if (Array.isArray(message)) {
        return message.join(', ')
      }
    }
  }

  if (exception instanceof Error && exception.message) {
    return exception.message
  }

  return '服务异常，请稍后重试'
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const request = ctx.getRequest()
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    response.status(status).json({
      success: false,
      statusCode: status,
      message: getMessage(exception),
      path: request.url,
      timestamp: new Date().toISOString(),
      data: null,
    })
  }
}
