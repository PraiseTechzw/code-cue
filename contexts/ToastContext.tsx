"use client"

import { createContext, useState, useContext, type ReactNode } from "react"
import { Toast, type ToastType } from "@/components/Toast"

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void
  hideToast: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState("")
  const [type, setType] = useState<ToastType>("info")
  const [duration, setDuration] = useState(3000)

  const showToast = (message: string, type: ToastType = "info", duration = 3000) => {
    setMessage(message)
    setType(type)
    setDuration(duration)
    setVisible(true)
  }

  const hideToast = () => {
    setVisible(false)
  }

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast visible={visible} message={message} type={type} duration={duration} onDismiss={hideToast} />
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
