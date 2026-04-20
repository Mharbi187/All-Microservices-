// ============================================================
// NEXUS-AID — Root Application Component
// Provides theme, i18n, query client, and routing
// ============================================================

import { useEffect } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import frFR from 'antd/locale/fr_FR';
import { router } from '@/config/routes';
import { lightTheme, darkTheme } from '@/config/theme';
import { useUIStore } from '@/stores';

// ---- React Query Client ----
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,         // 10 minutes garbage collection
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  const themeMode = useUIStore((state) => state.themeMode);
  const currentTheme = themeMode === 'dark' ? darkTheme : lightTheme;

  // Sync CSS custom properties theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);


  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={currentTheme} locale={frFR}>
        <AntApp>
          <RouterProvider router={router} />
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
