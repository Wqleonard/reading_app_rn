import axios, { AxiosError } from 'axios';

export type ApiErrorCode =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export type ApiError = {
  code: ApiErrorCode;
  status?: number;
  message: string;
  raw?: unknown;
};

export function mapAxiosError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return { code: 'UNKNOWN', message: 'Unknown error', raw: error };
  }

  const axiosError = error as AxiosError;
  const status = axiosError.response?.status;

  if (axiosError.code === 'ECONNABORTED') {
    return { code: 'TIMEOUT', message: 'Request timeout', raw: error };
  }

  if (!status) {
    return { code: 'NETWORK', message: 'Network error', raw: error };
  }

  if (status === 401) {
    return { code: 'UNAUTHORIZED', status, message: 'Unauthorized', raw: error };
  }
  if (status === 403) {
    return { code: 'FORBIDDEN', status, message: 'Forbidden', raw: error };
  }
  if (status === 404) {
    return { code: 'NOT_FOUND', status, message: 'Not found', raw: error };
  }
  if (status >= 500) {
    return { code: 'SERVER_ERROR', status, message: 'Server error', raw: error };
  }

  return {
    code: 'UNKNOWN',
    status,
    message: axiosError.message || 'Unknown API error',
    raw: error,
  };
}
