import { atom } from 'jotai';
import { User } from '../types';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};

// Default admin PIN is 123456
const defaultUser: User = {
  id: '1',
  pin: '123456',
};

export const authAtom = atom<AuthState>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
});

export const loginAtom = atom(
  null,
  (get, set, pin: string) => {
    set(authAtom, { ...get(authAtom), isLoading: true, error: null });

    // Simulate authentication delay
    setTimeout(() => {
      if (pin === defaultUser.pin) {
        set(authAtom, {
          user: defaultUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        // Store auth state in session storage
        sessionStorage.setItem('user', JSON.stringify(defaultUser));
      } else {
        set(authAtom, {
          ...get(authAtom),
          isLoading: false,
          error: 'Invalid PIN. Please try again.',
        });
      }
    }, 500);
  }
);

export const logoutAtom = atom(null, (_, set) => {
  // Clear session storage
  sessionStorage.removeItem('user');
  
  set(authAtom, {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
});

// Initialize auth state from session storage
export const initAuthAtom = atom(null, (_, set) => {
  const storedUser = sessionStorage.getItem('user');
  
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser) as User;
      set(authAtom, {
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (e) {
      sessionStorage.removeItem('user');
      set(authAtom, {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }
});