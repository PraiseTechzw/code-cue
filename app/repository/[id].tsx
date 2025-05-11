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
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { githubService } from '@/services/githubService';
import { projectService } from '@/services/projectService';
import { taskService } from '@/services/taskService';
import Colors from '@/constants/Colors';

export default function RepositoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [repo, setRepo] = useState<any>(null);
  const [commits, setCommits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [linkingProject, setLinkingProject] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [linkingTaskId, setLinkingTaskId] = useState<string | null>(null);
  const [linkingCommitId, setLinkingCommitId] = useState<string | null>(null);
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

  useEffect(() => {
    (async () => {
      const projectsData = await projectService.getProjects();
      setProjects(projectsData);
    })();
  }, []);

  useEffect(() => {
    if (repo?.project_id) {
      (async () => {
        const tasksData = await taskService.getTasksByProject(repo.project_id);
        setTasks(tasksData);
      })();
    } else {
      setTasks([]);
    }
  }, [repo?.project_id]);

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

  const handleLinkProject = async (projectId: string) => {
    setLinkingProject(true);
    try {
      await githubService.linkRepositoryToProject(repo.id, projectId);
      setRepo({ ...repo, project_id: projectId });
      setShowProjectModal(false);
    } finally {
      setLinkingProject(false);
    }
  };

  const handleLinkTask = async (commitId: string, taskId: string) => {
    setLinkingTaskId(taskId);
    setLinkingCommitId(commitId);
    try {
      await githubService.linkCommitToTask(commitId, taskId);
      setCommits(commits.map(c => c.id === commitId ? { ...c, task_id: taskId } : c));
      setShowTaskModal(false);
    } finally {
      setLinkingTaskId(null);
      setLinkingCommitId(null);
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
        {repo?.project_id && projects.length > 0 && (
          <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="briefcase-outline" size={16} color={theme.tint} style={{ marginRight: 4 }} />
            <Text style={{ color: theme.textDim, fontSize: 13, marginRight: 8 }}>Linked Project:</Text>
            <View style={{ backgroundColor: theme.tintLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: theme.tint, fontWeight: 'bold', fontSize: 13 }}>
                {projects.find(p => p.id === repo.project_id)?.name || 'Project'}
              </Text>
            </View>
          </View>
        )}
        <TouchableOpacity
          style={{ marginTop: 10, alignSelf: 'flex-start', backgroundColor: theme.tintLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
          onPress={() => setShowProjectModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="link-outline" size={16} color={theme.tint} style={{ marginRight: 4 }} />
          <Text style={{ color: theme.tint, fontWeight: '500', fontSize: 13 }}>Link to Project</Text>
        </TouchableOpacity>
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
        {repo?.project_id && (
          <TouchableOpacity
            style={{ marginLeft: 8, backgroundColor: theme.tintLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}
            onPress={() => {
              setShowTaskModal(true);
              setLinkingCommitId(item.id);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="link-outline" size={14} color={theme.tint} style={{ marginRight: 2 }} />
            <Text style={{ color: theme.tint, fontWeight: '500', fontSize: 12 }}>Link to Task</Text>
          </TouchableOpacity>
        )}
        {item.task_id && tasks.length > 0 && (
          <View style={{ marginLeft: 8, backgroundColor: theme.tintLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Ionicons name="checkmark-done-outline" size={14} color={theme.tint} style={{ marginRight: 2 }} />
            <Text style={{ color: theme.tint, fontWeight: '500', fontSize: 12 }}>
              {tasks.find(t => t.id === item.task_id)?.name || 'Task'}
            </Text>
          </View>
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
      {/* Project Link Modal */}
      <Modal
        visible={showProjectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProjectModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPressOut={() => setShowProjectModal(false)}
        >
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.cardBackground, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: theme.border }}>
              <Ionicons name="search" size={18} color={theme.textDim} />
              <TextInput
                style={{ flex: 1, marginLeft: 8, color: theme.text, fontSize: 16 }}
                placeholder="Search projects..."
                placeholderTextColor={theme.textDim}
                value={projectSearch}
                onChangeText={setProjectSearch}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowProjectModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 16, borderBottomWidth: 1, borderColor: theme.border, backgroundColor: repo?.project_id === item.id ? theme.tintLight : 'transparent', borderRadius: 10 }}
                  activeOpacity={0.7}
                  onPress={() => handleLinkProject(item.id)}
                  disabled={linkingProject}
                >
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>{item.name}</Text>
                  {repo?.project_id === item.id && (
                    <Ionicons name="checkmark-circle" size={18} color={theme.tint} style={{ position: 'absolute', right: 16, top: 20 }} />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
              ListEmptyComponent={<View style={{ alignItems: 'center', padding: 32 }}><Ionicons name="alert-circle-outline" size={40} color={theme.textDim} /><Text style={{ color: theme.textDim, marginTop: 12 }}>No projects found</Text></View>}
            />
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Task Link Modal */}
      <Modal
        visible={showTaskModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTaskModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPressOut={() => setShowTaskModal(false)}
        >
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.cardBackground, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: theme.border }}>
              <Ionicons name="search" size={18} color={theme.textDim} />
              <TextInput
                style={{ flex: 1, marginLeft: 8, color: theme.text, fontSize: 16 }}
                placeholder="Search tasks..."
                placeholderTextColor={theme.textDim}
                value={taskSearch}
                onChangeText={setTaskSearch}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowTaskModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={tasks.filter(t => t.name.toLowerCase().includes(taskSearch.toLowerCase()))}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 16, borderBottomWidth: 1, borderColor: theme.border, backgroundColor: linkingTaskId === item.id ? theme.tintLight : 'transparent', borderRadius: 10 }}
                  activeOpacity={0.7}
                  onPress={() => handleLinkTask(linkingCommitId, item.id)}
                  disabled={linkingTaskId === item.id}
                >
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>{item.name}</Text>
                  {linkingTaskId === item.id && (
                    <Ionicons name="checkmark-circle" size={18} color={theme.tint} style={{ position: 'absolute', right: 16, top: 20 }} />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
              ListEmptyComponent={<View style={{ alignItems: 'center', padding: 32 }}><Ionicons name="alert-circle-outline" size={40} color={theme.textDim} /><Text style={{ color: theme.textDim, marginTop: 12 }}>No tasks found</Text></View>}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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