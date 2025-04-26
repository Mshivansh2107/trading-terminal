import { atom } from 'jotai';
import { User } from '../types';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};

// Shared PIN for all users (123456)
const SHARED_PIN = '123456';

// Predefined users - all use the same PIN code
const users: User[] = [
  { id: '1', username: 'admin', pin: SHARED_PIN },
  { id: '2', username: 'user1', pin: SHARED_PIN },
  { id: '3', username: 'user2', pin: SHARED_PIN },
  { id: '4', username: 'manager', pin: SHARED_PIN },
];

export const authAtom = atom<AuthState>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
});

export const loginAtom = atom(
  null,
  (get, set, formData: { username: string; pin: string }) => {
    set(authAtom, { ...get(authAtom), isLoading: true, error: null });

    // Simulate authentication delay
    setTimeout(() => {
      // Find user by username
      const user = users.find(u => u.username === formData.username);
      
      if (user && formData.pin === user.pin) {
        set(authAtom, {
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        // Store auth state in session storage
        sessionStorage.setItem('user', JSON.stringify(user));
      } else {
        set(authAtom, {
          ...get(authAtom),
          isLoading: false,
          error: 'Invalid username or PIN. Please try again.',
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

// Export users list for UI
export const usersAtom = atom(users);