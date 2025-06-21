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
  Dimensions,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MotiView, MotiText, AnimatePresence } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { format, isToday, isYesterday, isTomorrow } from "date-fns";
import { githubService } from '@/services/githubService';
import { projectService } from '@/services/projectService';
import { taskService } from '@/services/taskService';
import { useToast } from '@/contexts/ToastContext';
import Colors from '@/constants/Colors';

const { width } = Dimensions.get('window');

export default function RepositoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { showToast } = useToast();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
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
  const [commitSearch, setCommitSearch] = useState('');
  const [showCommitSearch, setShowCommitSearch] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [stats, setStats] = useState({
    totalCommits: 0,
    recentCommits: 0,
    contributors: 0,
    lastCommit: null as any,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const repoData = await githubService.getRepositoryById(id as string);
      setRepo(repoData);
      const commitsData = await githubService.getCommits(id as string);
      setCommits(commitsData);
      
      // Calculate stats
      const totalCommits = commitsData.length;
      const recentCommits = commitsData.filter((commit: any) => {
        if (!commit.committed_at) return false;
        const commitDate = new Date(commit.committed_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return commitDate >= weekAgo;
      }).length;
      
      const contributors = new Set(commitsData.map((commit: any) => commit.author)).size;
      const lastCommit = commitsData.length > 0 ? commitsData[0] : null;
      
      setStats({
        totalCommits,
        recentCommits,
        contributors,
        lastCommit,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to load repository');
      showToast('Failed to load repository data', { type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, showToast]);

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
        // Validate project ID before getting tasks
        if (!repo.project_id || repo.project_id.trim() === '') {
          console.warn('Repository has invalid project_id:', repo.project_id)
          setTasks([])
          return
        }
        
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleViewCommit = (commit: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (repo?.html_url && commit.commit_id) {
      const commitUrl = `${repo.html_url}/commit/${commit.commit_id}`;
      // Open in browser
      window.open(commitUrl, '_blank');
    }
  };

  const formatCommitDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else if (isTomorrow(date)) {
      return 'Tomorrow';
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  const formatCommitTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  };

  const getFilteredCommits = () => {
    let filtered = commits;
    
    // Apply search filter
    if (commitSearch.trim()) {
      filtered = filtered.filter(commit => 
        commit.message?.toLowerCase().includes(commitSearch.toLowerCase()) ||
        commit.author?.toLowerCase().includes(commitSearch.toLowerCase()) ||
        commit.commit_id?.toLowerCase().includes(commitSearch.toLowerCase())
      );
    }
    
    // Apply status filter
    switch (selectedFilter) {
      case 'linked':
        filtered = filtered.filter(commit => commit.task_id);
        break;
      case 'unlinked':
        filtered = filtered.filter(commit => !commit.task_id);
        break;
      case 'recent':
        filtered = filtered.filter(commit => {
          if (!commit.committed_at) return false;
          const commitDate = new Date(commit.committed_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return commitDate >= weekAgo;
        });
        break;
      default:
        break;
    }
    
    return filtered;
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
    <MotiView
      from={{ opacity: 0, translateY: -20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500 }}
      style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}
    >
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[styles.repoName, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
          {repo?.name || 'Repository'}
        </Text>
        <Text style={[styles.repoOwner, { color: theme.textDim }]}>
          {repo?.full_name?.split('/')[0]}
        </Text>
      </View>
      <TouchableOpacity 
        onPress={() => setShowCommitSearch(!showCommitSearch)} 
        style={styles.searchButton}
      >
        <Ionicons name="search-outline" size={22} color={theme.text} />
      </TouchableOpacity>
    </MotiView>
  );

  const renderSearchBar = () => (
    <AnimatePresence>
      {showCommitSearch && (
        <MotiView
          from={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 50 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: "timing", duration: 300 }}
          style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        >
          <Ionicons name="search-outline" size={18} color={theme.textDim} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search commits..."
            placeholderTextColor={theme.textDim}
            value={commitSearch}
            onChangeText={setCommitSearch}
            autoFocus
          />
          {commitSearch.length > 0 && (
            <TouchableOpacity onPress={() => setCommitSearch('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={theme.textDim} />
            </TouchableOpacity>
          )}
        </MotiView>
      )}
    </AnimatePresence>
  );

  const renderRepoInfo = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500, delay: 200 }}
      style={[styles.repoCard, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}
    >
      <LinearGradient
        colors={[theme.tint, theme.tint]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.repoHeader}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="git-branch-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: "#fff", fontWeight: 'bold', fontSize: 18, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">
            {repo?.name}
          </Text>
          {repo?.html_url && (
            <TouchableOpacity 
              onPress={() => window.open(repo.html_url, '_blank')} 
              accessibilityLabel="View on GitHub"
              style={styles.externalLinkButton}
            >
              <Ionicons name="open-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        {repo?.description ? (
          <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, marginBottom: 8 }}>
            {repo.description}
          </Text>
        ) : null}
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Ionicons name="git-commit-outline" size={20} color={theme.tint} />
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.totalCommits}</Text>
          <Text style={[styles.statLabel, { color: theme.textDim }]}>Total Commits</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={20} color={theme.tint} />
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.recentCommits}</Text>
          <Text style={[styles.statLabel, { color: theme.textDim }]}>This Week</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="people-outline" size={20} color={theme.tint} />
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.contributors}</Text>
          <Text style={[styles.statLabel, { color: theme.textDim }]}>Contributors</Text>
        </View>
      </View>

      {/* Repository Details */}
      <View style={styles.repoDetails}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          {/* Owner */}
          {repo?.full_name && (
            <View style={[styles.chip, { backgroundColor: theme.tintLight }]}>
              <Ionicons name="person-outline" size={15} color={theme.tint} style={{ marginRight: 4 }} />
              <Text style={{ color: theme.tint, fontSize: 13, fontWeight: '500' }}>
                {repo.full_name.split('/')[0]}
              </Text>
            </View>
          )}
          {/* Visibility */}
          <View style={[styles.chip, { backgroundColor: theme.tintLight }]}>
            <Ionicons name="earth-outline" size={15} color={theme.tint} style={{ marginRight: 4 }} />
            <Text style={{ color: theme.tint, fontSize: 13, fontWeight: '500' }}>Public</Text>
          </View>
          {/* Last updated */}
          {repo?.updated_at && (
            <View style={[styles.chip, { backgroundColor: theme.tintLight }]}>
              <Ionicons name="time-outline" size={15} color={theme.tint} style={{ marginRight: 4 }} />
              <Text style={{ color: theme.tint, fontSize: 13, fontWeight: '500' }}>
                Updated {formatCommitDate(repo.updated_at)}
              </Text>
            </View>
          )}
        </View>

        {/* Project Link Section */}
        {repo?.project_id && projects.length > 0 && (
          <View style={styles.projectLinkSection}>
            <Ionicons name="briefcase-outline" size={16} color={theme.tint} style={{ marginRight: 8 }} />
            <Text style={{ color: theme.textDim, fontSize: 14, marginRight: 8 }}>Linked Project:</Text>
            <View style={[styles.projectChip, { backgroundColor: theme.tintLight }]}>
              <Text style={{ color: theme.tint, fontWeight: 'bold', fontSize: 13 }}>
                {projects.find(p => p.id === repo.project_id)?.name || 'Project'}
              </Text>
            </View>
          </View>
        )}

        {/* Link Project Button */}
        <TouchableOpacity
          style={[styles.linkProjectButton, { backgroundColor: theme.tintLight }]}
          onPress={() => setShowProjectModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="link-outline" size={16} color={theme.tint} style={{ marginRight: 8 }} />
          <Text style={{ color: theme.tint, fontWeight: '600', fontSize: 14 }}>
            {repo?.project_id ? 'Change Project Link' : 'Link to Project'}
          </Text>
        </TouchableOpacity>
      </View>
    </MotiView>
  );

  const renderFilterBar = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500, delay: 400 }}
      style={styles.filterBar}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor: selectedFilter === 'all' ? theme.tint : theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[
            styles.filterText,
            { color: selectedFilter === 'all' ? '#fff' : theme.textDim }
          ]}>
            All ({commits.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor: selectedFilter === 'recent' ? theme.tint : theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
          onPress={() => setSelectedFilter('recent')}
        >
          <Text style={[
            styles.filterText,
            { color: selectedFilter === 'recent' ? '#fff' : theme.textDim }
          ]}>
            Recent ({stats.recentCommits})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor: selectedFilter === 'linked' ? '#4CAF50' : theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
          onPress={() => setSelectedFilter('linked')}
        >
          <Text style={[
            styles.filterText,
            { color: selectedFilter === 'linked' ? '#fff' : theme.textDim }
          ]}>
            Linked ({commits.filter(c => c.task_id).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor: selectedFilter === 'unlinked' ? theme.tint : theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
          onPress={() => setSelectedFilter('unlinked')}
        >
          <Text style={[
            styles.filterText,
            { color: selectedFilter === 'unlinked' ? '#fff' : theme.textDim }
          ]}>
            Unlinked ({commits.filter(c => !c.task_id).length})
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </MotiView>
  );

  const renderCommit = ({ item, index }: { item: any; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: "timing", duration: 300, delay: index * 50 }}
      style={[styles.commitCard, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}
    >
      <View style={styles.commitHeader}>
        <View style={styles.commitIcon}>
          <Ionicons name="git-commit-outline" size={20} color={theme.tint} />
        </View>
        <View style={styles.commitContent}>
          <Text style={[styles.commitMessage, { color: theme.text }]} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.commitMeta}>
            <View style={styles.commitAuthor}>
              {/* Author avatar */}
              {item.author_avatar_url ? (
                <Image source={{ uri: item.author_avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.tintLight, justifyContent: 'center', alignItems: 'center' }]}> 
                  <Text style={{ color: theme.tint, fontWeight: 'bold', fontSize: 12 }}>
                    {item.author?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <Text style={[styles.authorName, { color: theme.textDim }]} numberOfLines={1}>
                {item.author}
              </Text>
            </View>
            
            <View style={styles.commitInfo}>
              <Text style={[styles.commitDate, { color: theme.textDim }]}>
                {formatCommitDate(item.committed_at)}
              </Text>
              <Text style={[styles.commitTime, { color: theme.textDim }]}>
                {formatCommitTime(item.committed_at)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.commitFooter}>
        <View style={styles.commitSha}>
          <Ionicons name="code-outline" size={14} color={theme.textDim} />
          <Text style={[styles.shaText, { color: theme.textDim }]}>
            {item.commit_id?.substring(0, 7)}
          </Text>
        </View>

        <View style={styles.commitActions}>
          {repo?.html_url && item.commit_id && (
            <TouchableOpacity 
              onPress={() => handleViewCommit(item)} 
              style={[styles.actionButton, { backgroundColor: theme.tintLight }]}
              accessibilityLabel="View on GitHub"
            >
              <Ionicons name="open-outline" size={14} color={theme.tint} />
              <Text style={[styles.actionText, { color: theme.tint }]}>View</Text>
            </TouchableOpacity>
          )}
          
          {repo?.project_id && (
            <TouchableOpacity
              style={[
                styles.actionButton, 
                { backgroundColor: item.task_id ? '#E8F5E8' : theme.tintLight }
              ]}
              onPress={() => {
                setShowTaskModal(true);
                setLinkingCommitId(item.id);
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={item.task_id ? "checkmark-done-outline" : "link-outline"} 
                size={14} 
                color={item.task_id ? '#4CAF50' : theme.tint} 
              />
              <Text style={[
                styles.actionText, 
                { color: item.task_id ? '#4CAF50' : theme.tint }
              ]}>
                {item.task_id ? 'Linked' : 'Link Task'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {item.task_id && tasks.length > 0 && (
          <View style={[styles.linkedTask, { backgroundColor: '#E8F5E8' }]}>
            <Ionicons name="briefcase-outline" size={12} color="#4CAF50" />
            <Text style={[styles.linkedTaskText, { color: '#4CAF50' }]} numberOfLines={1}>
              {tasks.find(t => t.id === item.task_id)?.name || 'Task'}
            </Text>
          </View>
        )}
      </View>
    </MotiView>
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
      {renderSearchBar()}
      {renderFilterBar()}
      {renderRepoInfo()}
      <FlatList
        data={getFilteredCommits()}
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
                  onPress={() => linkingCommitId && handleLinkTask(linkingCommitId, item.id)}
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
  searchButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 8,
  },
  clearButton: {
    padding: 8,
    borderRadius: 20,
  },
  repoHeader: {
    borderRadius: 16,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  repoDetails: {
    padding: 16,
  },
  projectLinkSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  linkProjectButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  externalLinkButton: {
    padding: 8,
    borderRadius: 20,
  },
  commitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commitIcon: {
    padding: 8,
  },
  commitContent: {
    flex: 1,
  },
  commitMessage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  commitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  commitAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    marginLeft: 8,
  },
  commitInfo: {
    marginLeft: 12,
  },
  commitDate: {
    fontSize: 13,
  },
  commitTime: {
    fontSize: 13,
  },
  commitFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commitSha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shaText: {
    marginLeft: 4,
  },
  commitActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  actionText: {
    marginLeft: 4,
  },
  linkedTask: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  linkedTaskText: {
    marginLeft: 4,
  },
  filterBar: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  filterScroll: {
    padding: 8,
  },
  filterChip: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 