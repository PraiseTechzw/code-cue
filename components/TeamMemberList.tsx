import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useColorScheme } from "react-native"
import Colors from "@/constants/Colors"

interface TeamMember {
  id: string
  name: string
  avatar_url?: string
  role: string
}

interface TeamMemberListProps {
  members: TeamMember[]
  onMemberPress: (memberId: string) => void
}

export function TeamMemberList({ members, onMemberPress }: TeamMemberListProps) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme ?? "light"]

  if (members.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people" size={48} color={theme.textDim} />
        <Text style={[styles.emptyText, { color: theme.textDim }]}>No team members yet</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {members.map((member) => (
        <TouchableOpacity
          key={member.id}
          style={[styles.memberItem, { backgroundColor: theme.cardBackground }]}
          onPress={() => onMemberPress(member.id)}
        >
          <View style={styles.memberLeft}>
            {member.avatar_url ? (
              <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.tintLight }]}>
                <Text style={[styles.avatarText, { color: theme.tint }]}>
                  {member.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={[styles.memberName, { color: theme.text }]}>{member.name}</Text>
              <Text style={[styles.memberRole, { color: theme.textDim }]}>{member.role}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  memberName: {
    fontSize: 16,
    fontWeight: "500",
  },
  memberRole: {
    fontSize: 12,
    marginTop: 4,
  },
}) 