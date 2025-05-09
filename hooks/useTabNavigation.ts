import { useNavigation } from "expo-router"
import * as Haptics from "expo-haptics"

export function useTabNavigation() {
  const navigation = useNavigation()

  const navigateToTab = (tabName: string, params?: Record<string, any>) => {
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    // Navigate to the tab
    navigation.navigate(tabName as never, params as never)
  }

  return {
    navigateToTab,
    navigation,
  }
}
