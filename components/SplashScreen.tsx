"use client"

import React, { useEffect, useRef, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  StatusBar,
} from "react-native"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"
import { LinearGradient } from "expo-linear-gradient"
import Ionicons from "@expo/vector-icons/Ionicons"

const { width, height } = Dimensions.get("window")

interface SplashScreenProps {
  onAnimationComplete?: () => void
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoRotation = useRef(new Animated.Value(0)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const textTranslateY = useRef(new Animated.Value(30)).current
  const progressOpacity = useRef(new Animated.Value(0)).current
  const progressWidth = useRef(new Animated.Value(0)).current
  const dotsOpacity = useRef(new Animated.Value(0)).current
  
  // Loading states
  const [loadingStep, setLoadingStep] = useState(0)
  const [loadingText, setLoadingText] = useState("Initializing...")

  const loadingSteps = [
    { text: "Initializing...", duration: 800 },
    { text: "Loading services...", duration: 600 },
    { text: "Preparing workspace...", duration: 700 },
    { text: "Almost ready...", duration: 500 },
  ]

  useEffect(() => {
    startAnimation()
    startLoadingSequence()
  }, [])

  const startLoadingSequence = () => {
    let currentStep = 0
    
    const nextStep = () => {
      if (currentStep < loadingSteps.length) {
        setLoadingStep(currentStep)
        setLoadingText(loadingSteps[currentStep].text)
        currentStep++
        setTimeout(nextStep, loadingSteps[currentStep - 1].duration)
      }
    }
    
    nextStep()
  }

  const startAnimation = () => {
    // Logo animation with rotation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
      // Text animation
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Progress bar animation
      Animated.parallel([
        Animated.timing(progressOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(progressWidth, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
      ]),
      // Dots animation
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animation complete
      setTimeout(() => {
        onAnimationComplete?.()
      }, 800)
    })
  }

  const logoRotate = logoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"} 
        backgroundColor={theme.background}
      />
      
      <LinearGradient
        colors={[theme.background, theme.tintLight]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { rotate: logoRotate },
              ],
            },
          ]}
        >
          <View style={styles.logoWrapper}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={[styles.logoGlow, { backgroundColor: theme.tint }]} />
          </View>
        </Animated.View>

        {/* App Name */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={[styles.appName, { color: theme.text }]}>
            CodeCue
          </Text>
          <Text style={[styles.tagline, { color: theme.textDim }]}>
            Smart Project Management
          </Text>
        </Animated.View>

        {/* Loading Progress */}
        <Animated.View
          style={[
            styles.progressContainer,
            {
              opacity: progressOpacity,
            },
          ]}
        >
          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: theme.tint,
                  width: progressWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
          
          <View style={styles.loadingTextContainer}>
            <Text style={[styles.loadingText, { color: theme.textDim }]}>
              {loadingText}
            </Text>
            <Animated.View
              style={[
                styles.dotsContainer,
                {
                  opacity: dotsOpacity,
                },
              ]}
            >
              <Text style={[styles.dots, { color: theme.tint }]}>...</Text>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Features Preview */}
        <Animated.View
          style={[
            styles.featuresContainer,
            {
              opacity: textOpacity,
            },
          ]}
        >
          <View style={styles.featureItem}>
            <Ionicons name="folder" size={16} color={theme.tint} />
            <Text style={[styles.featureText, { color: theme.textDim }]}>
              Projects
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="git-branch" size={16} color={theme.tint} />
            <Text style={[styles.featureText, { color: theme.textDim }]}>
              GitHub
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="analytics" size={16} color={theme.tint} />
            <Text style={[styles.featureText, { color: theme.textDim }]}>
              Insights
            </Text>
          </View>
        </Animated.View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: theme.textDim }]}>
            v1.0.0
          </Text>
        </View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoWrapper: {
    position: "relative",
  },
  logo: {
    width: 120,
    height: 120,
  },
  logoGlow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 60,
    opacity: 0.3,
    zIndex: -1,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  appName: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  progressContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 40,
  },
  progressBar: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  loadingTextContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dotsContainer: {
    marginLeft: 4,
  },
  dots: {
    fontSize: 14,
    fontWeight: "bold",
  },
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  featureText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  versionContainer: {
    position: "absolute",
    bottom: 60,
  },
  versionText: {
    fontSize: 12,
    fontWeight: "400",
  },
}) 