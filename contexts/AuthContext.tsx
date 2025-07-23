"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext } from "react"
import { account, client } from "@/lib/appwrite"
import type { AppwriteUser, AppwriteSession } from "@/types/appwrite"
import { Alert } from "react-native"
import NetInfo from "@react-native-community/netinfo"
import { ID } from 'appwrite'

type AuthContextType = {
  user: AppwriteUser | null
  session: AppwriteSession | null
  loading: boolean
  isConnected: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<boolean>
  resetPassword: (email: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppwriteUser | null>(null)
  const [session, setSession] = useState<AppwriteSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    // Subscribe to network state
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false)
    })

    // Check current auth state
    const checkAuthState = async () => {
      try {
        const currentUser = await account.get()
        setUser(currentUser)
        
        // Get current session
        const sessions = await account.listSessions()
        const currentSession = sessions.sessions.find(s => s.current)
        setSession(currentSession || null)
      } catch (error: any) {
        // User not authenticated
        setUser(null)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuthState()

    return () => {
      unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // Generate a valid user ID (max 36 chars, alphanumeric + period, hyphen, underscore)
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const createResult = await account.create(
        userId,
        email,
        password,
        fullName
      )

      // Sign in after successful registration
      await signIn(email, password)
      return true
    } catch (error: any) {
      Alert.alert("Error", error.message)
      return false
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      // In Appwrite v18+, we need to use createEmailSession for email/password auth
      const session = await account.createEmailPasswordSession(email, password)
      
      const currentUser = await account.get()
      
      setUser(currentUser)
      setSession(session)
      return true
    } catch (error: any) {
      Alert.alert("Error", error.message)
      return false
    }
  }

  const signOut = async () => {
    try {
      const deleteResult = await account.deleteSessions()
      setUser(null)
      setSession(null)
      return true
    } catch (error: any) {
      Alert.alert("Error", error.message)
      return false
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const recoveryResult = await account.createRecovery(
        email,
        "codeCue://reset-password"
      )
      return true
    } catch (error: any) {
      Alert.alert("Error", error.message)
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConnected,
        signUp,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
