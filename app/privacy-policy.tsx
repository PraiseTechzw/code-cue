"use client"

import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import  Ionicons  from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"

export default function PrivacyPolicyScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  const handleBack = () => {
    router.back()
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Introduction</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            This Privacy Policy explains how we collect, use, and protect your personal information when you use our
            application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Information We Collect</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            We collect information that you provide directly to us, such as your name, email address, and profile
            information. We also collect information about your usage of the app, including tasks, projects, and
            activity data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>How We Use Your Information</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            We use your information to provide, maintain, and improve our services, to communicate with you, and to
            personalize your experience.
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            We may use your data to generate insights and recommendations to help you improve your productivity.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Storage</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            Your data is stored securely in our database. We implement appropriate security measures to protect your
            personal information.
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            In offline mode, your data is stored locally on your device and synchronized with our servers when you
            reconnect.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Third-Party Services</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            We may use third-party services, such as GitHub, to enhance your experience. These services have their own
            privacy policies.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Rights</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            You have the right to access, update, or delete your personal information. You can manage your data in the
            app settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Changes to This Policy</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
            policy in the app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Us</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            If you have any questions about this Privacy Policy, please contact us at support@codecue.app.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textDim }]}>Last updated: May 9, 2023</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  footer: {
    marginTop: 16,
    marginBottom: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
  },
})
