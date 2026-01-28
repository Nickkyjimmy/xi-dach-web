'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(57, 62, 70, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(223, 208, 184, 0.2)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#DFD0B8',
          },
          classNames: {
            success: 'text-[#9ab896]',
            error: 'text-[#c49090]',
            warning: 'text-[#d4c890]',
          },
        }}
      />
    </QueryClientProvider>
  )
}
