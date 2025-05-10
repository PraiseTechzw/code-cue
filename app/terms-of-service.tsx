"use client"

import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"

export default function TermsOfServiceScreen() {
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
        <Text style={[styles.title, { color: theme.text }]}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Acceptance of Terms</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            By accessing or using our application, you agree to be bound by these Terms of Service and all applicable
            laws and regulations.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Use of the Service</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            You may use our service only for lawful purposes and in accordance with these Terms. You agree not to use
            the service:
          </Text>
          <Text style={[styles.listItem, { color: theme.text }]}>
            • In any way that violates any applicable law or regulation.
          </Text>
          <Text style={[styles.listItem, { color: theme.text }]}>
            • To transmit any material that is unlawful, threatening, abusive, or otherwise objectionable.
          </Text>
          <Text style={[styles.listItem, { color: theme.text }]}>
            • To impersonate or attempt to impersonate any person or entity.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>3. User Accounts</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            To use certain features of the service, you must create an account. You are responsible for maintaining the
            confidentiality of your account information.
          </Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            You are responsible for all activities that occur under your account. You agree to notify us immediately of
            any unauthorized use of your account.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>4. Intellectual Property</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            The service and its original content, features, and functionality are owned by us and are protected by
            international copyright, trademark, and other intellectual property laws.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>5. Termination</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            We may terminate or suspend your account and access to the service immediately, without prior notice or
            liability, for any reason whatsoever, including without limitation if you breach these Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>6. Limitation of Liability</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            In no event shall we be liable for any indirect, incidental, special, consequential, or punitive damages,
            including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>7. Changes to Terms</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            We reserve the right to modify or replace these Terms at any time. We will provide notice of any changes by
            posting the new Terms on the service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>8. Contact Us</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            If you have any questions about these Terms, please contact us at support@codecue.app.
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
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 16,
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
