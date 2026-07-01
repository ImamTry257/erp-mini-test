import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

function parseClassValidatorMessage(message: string) {
  const match = message.match(/^(\w+)\s(.+)$/);
  if (match) {
    return { field: match[1], message: match[2] };
  }
  return { field: 'unknown', message };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: { field: string; message: string }[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;

      const errorRes = exception.getResponse();
      if (
        typeof errorRes === 'object' &&
        errorRes !== null &&
        'message' in errorRes
      ) {
        const msg = (errorRes as any).message;
        if (Array.isArray(msg)) {
          errors = msg.map((m: string) => parseClassValidatorMessage(m));
        }
      }
    }

    res.status(status).json({
      success: false,
      message,
      errors,
      statusCode: status,
    });
  }
}
