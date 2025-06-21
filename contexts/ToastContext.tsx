"use client"

import { createContext, useState, useContext, type ReactNode } from "react"
import { Toast, type ToastType, type ToastPosition, type ToastAnimation } from "@/components/Toast"

interface ToastOptions {
  type?: ToastType
  duration?: number
  position?: ToastPosition
  animation?: ToastAnimation
}

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void
  hideToast: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState("")
  const [type, setType] = useState<ToastType>("info")
  const [duration, setDuration] = useState(3000)
  const [position, setPosition] = useState<ToastPosition>("top")
  const [animation, setAnimation] = useState<ToastAnimation>("slide")

  const showToast = (message: string, options?: ToastOptions) => {
    setMessage(message)
    setType(options?.type || "info")
    setDuration(options?.duration || 3000)
    setPosition(options?.position || "top")
    setAnimation(options?.animation || "slide")
    setVisible(true)
  }

  const hideToast = () => {
    setVisible(false)
  }

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast
        visible={visible}
        message={message}
        type={type}
        duration={duration}
        position={position}
        animation={animation}
        onDismiss={hideToast}
      />
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
