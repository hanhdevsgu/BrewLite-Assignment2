'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Role } from '@/types';

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * Kiểm tra phân quyền và phiên đăng nhập.
 * Bắt buộc người dùng phải có phiên đăng nhập hợp lệ (có cả user và JWT token hoặc refresh token còn hạn)
 * trước khi cho phép truy cập các màn hình nhạy cảm (Checkout, Lịch sử đơn, Staff, Admin).
 */
export function useRequireRole(allowedRoles: Role[]) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const [ready, setReady] = useState(false);
  const rolesKey = allowedRoles.join(',');
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { user: storeUser, token: storeToken, setAuth, logout } = useAuthStore.getState();

    // 1. Lấy token và user từ store hoặc localStorage
    const currentToken = storeToken || localStorage.getItem('brewlite_token');
    let currentUser = storeUser;

    if (!currentUser) {
      const storedUser = localStorage.getItem('brewlite_user');
      if (storedUser) {
        try {
          currentUser = JSON.parse(storedUser);
        } catch {
          currentUser = null;
        }
      }
    }

    // 2. Nếu thiếu token hoặc thiếu user -> chưa đăng nhập
    if (!currentToken || !currentUser) {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        setReady(false);
        logout();
        router.replace(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
      }
      return;
    }

    // 3. Kiểm tra thời hạn JWT: chỉ ép đăng xuất nếu KHÔNG có refresh token dự phòng
    const payload = decodeJwtPayload(currentToken);
    const hasRefreshToken = Boolean(localStorage.getItem('brewlite_refresh_token'));
    if (payload?.exp && payload.exp * 1000 < Date.now() && !hasRefreshToken) {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        setReady(false);
        logout();
        router.replace(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
      }
      return;
    }

    // 4. Đồng bộ ngược lại Zustand store nếu state đang trống
    if (!storeUser && currentUser) {
      setAuth(currentUser, currentToken);
    }

    // 5. Kiểm tra phân quyền vai trò (Role)
    const allowed = rolesKey.split(',') as Role[];
    if (!allowed.includes(currentUser.role)) {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        router.replace('/');
      }
      return;
    }

    setReady(true);
  }, [rolesKey, pathname, router]);

  return { ready, user };
}
