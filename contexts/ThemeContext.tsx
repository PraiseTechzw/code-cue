"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useColorScheme } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

type ThemeType = "light" | "dark" | "system"

interface ThemeContextType {
  theme: "light" | "dark"
  themePreference: ThemeType
  setThemePreference: (theme: ThemeType) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  themePreference: "system",
  setThemePreference: () => {},
  isDark: false,
})

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider: React.FC<{
  children: React.ReactNode | ((props: { theme: "light" | "dark" }) => React.ReactNode)
}> = ({ children }) => {
  const systemColorScheme = useColorScheme() || "light"
  const [themePreference, setThemePreferenceState] = useState<ThemeType>("system")
  const [isLoading, setIsLoading] = useState(true)

  // Load saved theme preference
  useEffect(() => {
    async function loadThemePreference() {
      try {
        const savedTheme = await AsyncStorage.getItem("themePreference")
        if (savedTheme) {
          setThemePreferenceState(savedTheme as ThemeType)
        }
      } catch (error) {
        console.error("Failed to load theme preference:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadThemePreference()
  }, [])

  // Save theme preference when it changes
  const setThemePreference = async (newTheme: ThemeType) => {
    try {
      await AsyncStorage.setItem("themePreference", newTheme)
      setThemePreferenceState(newTheme)
    } catch (error) {
      console.error("Failed to save theme preference:", error)
    }
  }

  // Determine actual theme based on preference
  const actualTheme = themePreference === "system" ? systemColorScheme : themePreference

  const isDark = actualTheme === "dark"

  // Don't render until we've loaded the saved theme preference
  if (isLoading) {
    return null
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: actualTheme,
        themePreference,
        setThemePreference,
        isDark,
      }}
    >
      {typeof children === "function" ? children({ theme: actualTheme }) : children}
    </ThemeContext.Provider>
  )
}
