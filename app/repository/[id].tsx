import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { githubService } from '@/services/githubService';
import Colors from '@/constants/Colors';

export default function RepositoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [repo, setRepo] = useState<any>(null);
  const [commits, setCommits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = Colors['light']; // Replace with useColorScheme if you support dark mode

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const repoData = await githubService.getRepositoryById(id as string);
      setRepo(repoData);
      const commitsData = await githubService.getCommits(id as string);
      setCommits(commitsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load repository');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleBack = () => {
    router.back();
  };

  const handleViewCommit = (commit: any) => {
    if (repo?.html_url && commit.commit_id) {
      const commitUrl = `${repo.html_url}/commit/${commit.commit_id}`;
      // Open in browser
      window.open(commitUrl, '_blank');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[styles.repoName, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">{repo?.name || 'Repository'}</Text>
        <Text style={[styles.repoOwner, { color: theme.textDim }]}>{repo?.full_name?.split('/')[0]}</Text>
      </View>
      <View style={{ width: 32 }} />
    </View>
  );

  const renderRepoInfo = () => (
    <View style={[styles.repoCard, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Ionicons name="git-branch-outline" size={22} color={theme.tint} style={{ marginRight: 8 }} />
        <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 18, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">{repo?.name}</Text>
        {repo?.html_url && (
          <TouchableOpacity onPress={() => window.open(repo.html_url, '_blank')} accessibilityLabel="View on GitHub">
            <Ionicons name="open-outline" size={20} color={theme.tint} />
          </TouchableOpacity>
        )}
      </View>
      {repo?.description ? (
        <Text style={{ color: theme.textDim, fontSize: 14, marginBottom: 8 }}>{repo.description}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flexShrink: 1, marginTop: 4 }}>
        {/* Owner */}
        {repo?.full_name && (
          <View style={styles.chip}>
            <Ionicons name="person-outline" size={15} color={theme.textDim} style={{ marginRight: 2 }} />
            <Text style={{ color: theme.textDim, fontSize: 13 }}>{repo.full_name.split('/')[0]}</Text>
          </View>
        )}
        {/* Visibility */}
        <View style={styles.chip}>
          <Ionicons name={'earth-outline'} size={15} color={theme.textDim} style={{ marginRight: 2 }} />
          <Text style={{ color: theme.textDim, fontSize: 13 }}>Public</Text>
        </View>
        {/* Commit count */}
        <View style={styles.chip}>
          <Ionicons name="git-commit-outline" size={15} color={theme.textDim} style={{ marginRight: 2 }} />
          <Text style={{ color: theme.textDim, fontSize: 13 }}>{commits.length} Commits</Text>
        </View>
        {/* Last updated */}
        {repo?.updated_at && (
          <View style={styles.chip}>
            <Ionicons name="time-outline" size={15} color={theme.textDim} style={{ marginRight: 2 }} />
            <Text style={{ color: theme.textDim, fontSize: 13 }}>Updated {new Date(repo.updated_at).toLocaleDateString()}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderCommit = ({ item }: { item: any }) => (
    <View style={[styles.commitCard, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="git-commit-outline" size={20} color={theme.tint} style={{ marginRight: 8 }} />
        <Text style={{ color: theme.text, fontWeight: '500', flex: 1 }} numberOfLines={2}>{item.message}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        {/* Author avatar (if available) */}
        {item.author_avatar_url ? (
          <Image source={{ uri: item.author_avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.tintLight, justifyContent: 'center', alignItems: 'center' }]}> 
            <Text style={{ color: theme.tint, fontWeight: 'bold' }}>{item.author?.[0] || '?'}</Text>
          </View>
        )}
        <Text style={{ color: theme.textDim, fontSize: 13, marginLeft: 8 }}>{item.author}</Text>
        <Text style={{ color: theme.textDim, fontSize: 13, marginLeft: 12 }}>{item.committed_at ? new Date(item.committed_at).toLocaleString() : ''}</Text>
        <Text style={{ color: theme.textDim, fontSize: 13, marginLeft: 12 }}>#{item.commit_id?.substring(0, 7)}</Text>
        {repo?.html_url && item.commit_id && (
          <TouchableOpacity onPress={() => handleViewCommit(item)} style={{ marginLeft: 8 }} accessibilityLabel="View on GitHub">
            <Ionicons name="open-outline" size={16} color={theme.tint} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={{ color: theme.textDim, marginTop: 16 }}>Loading commits…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
        {renderHeader()}
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.error} />
          <Text style={{ color: theme.error, marginTop: 16 }}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      {renderHeader()}
      {renderRepoInfo()}
      <FlatList
        data={commits}
        keyExtractor={item => item.id}
        renderItem={renderCommit}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.tint]} tintColor={theme.tint} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="git-commit-outline" size={60} color={theme.textDim} />
            <Text style={{ color: theme.textDim, marginTop: 16, fontSize: 16 }}>No commits found for this repository</Text>
            <Text style={{ color: theme.textDim, marginTop: 8, fontSize: 13 }}>Commits will appear here once they are pushed to this repository.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  repoName: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  repoOwner: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
  },
  repoCard: {
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 6,
    backgroundColor: '#f3f3f3',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  commitCard: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
}); 