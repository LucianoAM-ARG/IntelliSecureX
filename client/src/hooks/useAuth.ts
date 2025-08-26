import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

// Telegram Web App types
interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
      photo_url?: string;
    };
    chat_instance?: string;
    chat_type?: string;
    auth_date: number;
    hash: string;
  };
  isExpanded: boolean;
  expand(): void;
  close(): void;
  ready(): void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    setText(text: string): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function useAuth() {
  const [telegramWebApp, setTelegramWebApp] = useState<TelegramWebApp | null>(null);
  const [initData, setInitData] = useState<string>("");

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      setTelegramWebApp(tg);
      setInitData(tg.initData);
      
      // Expand the app to full height
      tg.expand();
      
      // Signal that the app is ready
      tg.ready();
    } else {
      console.warn("Telegram Web App not available. Running in web mode.");
      // For development/testing, you can set mock data here
    }
  }, []);

  const isTelegramApp = !!window.Telegram?.WebApp;

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!initData || !isTelegramApp, // Enable query if we have initData or not in Telegram
    retry: false,
  });

  const isAuthenticated = !!user;

  return {
    user,
    isLoading,
    isAuthenticated,
    isTelegramApp,
    telegramWebApp,
    initData,
    telegramUser: telegramWebApp?.initDataUnsafe?.user,
    error,
  };
}
