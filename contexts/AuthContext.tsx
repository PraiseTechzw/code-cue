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
    console.log('🔧 AuthContext: Initializing...')
    console.log('🔧 AuthContext: Account object:', account)
    console.log('🔧 AuthContext: Available account methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(account)))
    
    // Subscribe to network state
    const unsubscribe = NetInfo.addEventListener((state) => {
      console.log('🌐 Network state changed:', state)
      setIsConnected(state.isConnected ?? false)
    })

    // Check current auth state
    const checkAuthState = async () => {
      console.log('🔍 Checking auth state...')
      try {
        console.log('🔍 Calling account.get()...')
        const currentUser = await account.get()
        console.log('✅ User authenticated:', currentUser)
        setUser(currentUser)
        
        // Get current session
        console.log('🔍 Calling account.listSessions()...')
        const sessions = await account.listSessions()
        console.log('🔍 All sessions:', sessions)
        const currentSession = sessions.sessions.find(s => s.current)
        console.log('✅ Current session:', currentSession)
        setSession(currentSession || null)
      } catch (error: any) {
        console.log('❌ User not authenticated:', error)
        console.log('❌ Error details:', {
          name: error?.name,
          message: error?.message,
          code: error?.code,
          response: error?.response
        })
        // User not authenticated
        setUser(null)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuthState()

    return () => {
      console.log('🔧 AuthContext: Cleaning up...')
      unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    console.log('🚀 Starting sign up for:', email)
    console.log('🚀 Sign up params:', { email, password: '***', fullName })
    try {
      // Generate a valid user ID (max 36 chars, alphanumeric + period, hyphen, underscore)
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log('🆔 Generated user ID:', userId)
      console.log('🆔 User ID length:', userId.length)
      console.log('🆔 User ID valid chars:', /^[a-zA-Z0-9._-]+$/.test(userId))
      
      console.log('🚀 Calling account.create()...')
      const createResult = await account.create(
        userId,
        email,
        password,
        fullName
      )
      console.log('✅ User created successfully:', createResult)

      // Sign in after successful registration
      console.log('🔄 Auto-signing in after registration...')
      await signIn(email, password)
      return true
    } catch (error: any) {
      console.log('❌ Sign up failed:', error)
      console.log('❌ Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        response: error.response
      })
      Alert.alert("Error", error.message)
      return false
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Starting sign in for:', email)
    console.log('🔐 Sign in params:', { email, password: '***' })
    try {
      // In Appwrite v18+, we need to use createEmailSession for email/password auth
      console.log('🔐 Calling account.createEmailSession()...')
      const session = await account.createEmailPasswordSession(email, password)
      console.log('✅ Session created:', session)
      
      console.log('🔐 Calling account.get()...')
      const currentUser = await account.get()
      console.log('✅ User retrieved:', currentUser)
      
      setUser(currentUser)
      setSession(session)
      return true
    } catch (error: any) {
      console.log('❌ Sign in failed:', error)
      console.log('❌ Error details:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        response: error?.response
      })
      Alert.alert("Error", error.message)
      return false
    }
  }

  const signOut = async () => {
    console.log('🚪 Starting sign out...')
    try {
      console.log('🚪 Calling account.deleteSessions()...')
      const deleteResult = await account.deleteSessions()
      console.log('✅ Sessions deleted successfully:', deleteResult)
      setUser(null)
      setSession(null)
      return true
    } catch (error: any) {
      console.log('❌ Sign out failed:', error)
      console.log('❌ Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        response: error.response
      })
      Alert.alert("Error", error.message)
      return false
    }
  }

  const resetPassword = async (email: string) => {
    console.log('🔑 Starting password reset for:', email)
    try {
      console.log('🔑 Calling account.createRecovery()...')
      const recoveryResult = await account.createRecovery(
        email,
        "codeCue://reset-password"
      )
      console.log('✅ Password reset email sent:', recoveryResult)
      return true
    } catch (error: any) {
      console.log('❌ Password reset failed:', error)
      console.log('❌ Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        response: error.response
      })
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
