'use client';

import { useState, useEffect, useCallback } from 'react';

interface FavoriteActress {
  id: string;
  name_ja: string;
  name_cn: string | null;
  avatar_url: string | null;
  added_at: number;
}

interface UseFavoritesReturn {
  favorites: FavoriteActress[];
  isFavorite: (id: string) => boolean;
  addFavorite: (actress: Omit<FavoriteActress, 'added_at'>) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (actress: Omit<FavoriteActress, 'added_at'>) => void;
  favoriteCount: number;
}

const STORAGE_KEY = 'javstar_favorites';

/**
 * 收藏女優 Hook
 * 使用 localStorage 持久化存儲
 */
export function useFavorites(): UseFavoritesReturn {
  const [favorites, setFavorites] = useState<FavoriteActress[]>([]);

  // 從 localStorage 加載收藏
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  }, []);

  // 保存收藏到 localStorage
  const saveFavorites = useCallback((newFavorites: FavoriteActress[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (err) {
      console.error('Failed to save favorites:', err);
    }
  }, []);

  // 檢查是否已收藏
  const isFavorite = useCallback((id: string) => {
    return favorites.some(f => f.id === id);
  }, [favorites]);

  // 添加收藏
  const addFavorite = useCallback((actress: Omit<FavoriteActress, 'added_at'>) => {
    if (isFavorite(actress.id)) return;

    const newFavorite: FavoriteActress = {
      ...actress,
      added_at: Date.now(),
    };

    saveFavorites([newFavorite, ...favorites]);
  }, [favorites, isFavorite, saveFavorites]);

  // 移除收藏
  const removeFavorite = useCallback((id: string) => {
    saveFavorites(favorites.filter(f => f.id !== id));
  }, [favorites, saveFavorites]);

  // 切換收藏狀態
  const toggleFavorite = useCallback((actress: Omit<FavoriteActress, 'added_at'>) => {
    if (isFavorite(actress.id)) {
      removeFavorite(actress.id);
    } else {
      addFavorite(actress);
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return {
    favorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    favoriteCount: favorites.length,
  };
}

export default useFavorites;
