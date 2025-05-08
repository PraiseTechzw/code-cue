import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { offlineStore } from '@/services/offlineStore';

export const NetworkStatus = () => {
  const { isDarkMode } = useTheme();
  const [isConnected, setIsConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const slideAnim = new Animated.Value(-50);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const wasConnected = isConnected;
      const isNowConnected = state.isConnected ?? false;
      
      setIsConnected(isNowConnected);

      if (!wasConnected && isNowConnected) {
        // Show the banner when coming back online
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();

        // Start syncing
        setIsSyncing(true);
        try {
          await offlineStore.syncOfflineChanges();
          // Hide the banner after successful sync
          setTimeout(() => {
            Animated.spring(slideAnim, {
              toValue: -50,
              useNativeDriver: true,
              tension: 50,
              friction: 7,
            }).start();
          }, 2000);
        } catch (error) {
          console.error('Error syncing offline changes:', error);
        } finally {
          setIsSyncing(false);
        }
      } else if (wasConnected && !isNowConnected) {
        // Show the banner when going offline
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isConnected]);

  if (isConnected && !isSyncing) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={isConnected ? 'cloud-done-outline' : 'cloud-offline-outline'}
          size={24}
          color={isConnected ? '#4CAF50' : '#FF5252'}
        />
        <Text style={[styles.text, { color: isDarkMode ? '#ffffff' : '#000000' }]}>
          {isConnected
            ? isSyncing
              ? 'Syncing offline changes...'
              : 'Back online'
            : 'You are offline'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 