import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta: any | null;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Jika response sudah berbentuk envelope, lewati
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Jika response punya { data, meta } (pagination)
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            message: 'Success',
            data: data.data,
            meta: data.meta,
          };
        }

        return {
          success: true,
          message: 'Success',
          data,
          meta: null,
        };
      }),
    );
  }
}
