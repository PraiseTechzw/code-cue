import React from 'react'
import { SafeAreaView, StatusBar } from 'react-native'
import { GitHubDebugger } from '@/components/GitHubDebugger'

export default function GitHubDebugScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <GitHubDebugger />
    </SafeAreaView>
  )
} 