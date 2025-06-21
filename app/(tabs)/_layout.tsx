"use client";

import { useEffect, useState, useRef } from "react";
import { Tabs } from "expo-router";
import {
  useColorScheme,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
  Text,
  ColorSchemeName,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { notificationService } from "@/services/notificationService";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import GitHubConnectionBanner from "@/components/GitHubConnectionBanner";
import Colors from "@/constants/Colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import React from "react";

type IconName = keyof typeof Ionicons.glyphMap;

interface TabBarButtonProps {
  isFocused: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
  badge?: number;
  colorScheme?: ColorSchemeName;
}

// Custom Tab Bar Button component
function TabBarButton({
  isFocused,
  icon,
  label,
  onPress,
  badge = 0,
  colorScheme = "light",
}: TabBarButtonProps) {
  const theme = Colors[colorScheme ?? "light"];
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFocused]);

  const scale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const handlePress = () => {
    // Provide haptic feedback on tab press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={styles.tabButton}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={`${label} tab`}
    >
      <Animated.View
        style={[styles.tabButtonContent, { transform: [{ scale }] }]}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={24}
            color={isFocused ? theme.tint : theme.tabIconDefault}
          />

          {badge > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.tint }]}>
              <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
            </View>
          )}
        </View>

        <Animated.Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? theme.tint : theme.tabIconDefault,
              opacity: focusAnim,
              transform: [
                {
                  translateY: focusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -4],
                  }),
                },
              ],
            },
          ]}
        >
          {label}
        </Animated.Text>

        {isFocused && (
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                backgroundColor: theme.tint,
                opacity: focusAnim,
                transform: [{ scaleX: focusAnim }],
              },
            ]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [unreadCount, setUnreadCount] = useState(0);
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");

  useEffect(() => {
    // Get initial unread count
    loadUnreadCount();

    // Set up interval to refresh unread count
    const interval = setInterval(loadUnreadCount, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  // Custom tab bar component
  const renderTabBar = ({ state, descriptors, navigation }) => {
    return (
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title || route.name;

          const isFocused = state.index === index;

          // Determine icon based on route name
          let iconName: IconName = "ellipsis-horizontal";
          switch (route.name) {
            case "index":
              iconName = isFocused ? "home" : "home-outline";
              break;
            case "projects":
              iconName = isFocused ? "folder" : "folder-outline";
              break;
            case "github":
              iconName = "logo-github";
              break;
            case "insights":
              iconName = isFocused ? "bulb" : "bulb-outline";
              break;
            case "notifications":
              iconName = isFocused ? "notifications" : "notifications-outline";
              break;
            case "settings":
              iconName = isFocused ? "settings" : "settings-outline";
          }

          // Show badge only for notifications tab
          const badge = route.name === "notifications" ? unreadCount : 0;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabBarButton
              key={route.key}
              isFocused={isFocused}
              icon={iconName}
              label={label}
              onPress={onPress}
              badge={badge}
              colorScheme={colorScheme}
            />
          );
        })}
      </View>
    );
  };

  return (
    <>
      <ConnectionStatus />
      <GitHubConnectionBanner />

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.tint,
          tabBarStyle: {
            display: "none", // Hide the default tab bar since we're using a custom one
          },
          headerStyle: {
            backgroundColor: theme.background,
            elevation: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          headerTintColor: theme.text,
          headerShadowVisible: true,
          headerTitleStyle: {
            fontWeight: "600",
          },
        }}
        tabBar={renderTabBar}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: "Projects",
          }}
        />
        <Tabs.Screen
          name="github"
          options={{
            title: "GitHub",
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: "AI Insights",
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: "Notifications",
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  tabButtonContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    position: "relative",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "500",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -8,
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});
