import { create } from "zustand";

interface CartBadgeState {
  cartCount: number;
  wishlistCount: number;
  setCartCount: (n: number) => void;
  setWishlistCount: (n: number) => void;
}

export const useCartBadgeStore = create<CartBadgeState>((set) => ({
  cartCount: 0,
  wishlistCount: 0,
  setCartCount: (n) => set({ cartCount: n }),
  setWishlistCount: (n) => set({ wishlistCount: n }),
}));
