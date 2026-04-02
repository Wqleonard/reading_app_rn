import axios, { AxiosRequestConfig } from 'axios';

import { mapAxiosError } from '@/src/network/apiError';
import { kv } from '@/src/storage/kv/kv';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const TOKEN_KEY = 'auth.token';

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use(async (config) => {
  const token = await kv.getString(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(mapAxiosError(error));
  }
);

export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await httpClient.get<T>(url, config);
  return response.data;
}

export async function apiPost<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await httpClient.post<T>(url, body, config);
  return response.data;
}
