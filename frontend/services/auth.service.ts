import { api } from '@/lib/api';
import type { LoginInput, LoginResponse } from '@/types';

export const authService = {
  login: (data: LoginInput) =>
    api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
