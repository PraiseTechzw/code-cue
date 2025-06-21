"use client";

import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  TextInput,
  FlatList,
  Platform,
  ScrollView,
} from "react-native";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useColorScheme } from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView, MotiText, AnimatePresence } from "moti";
import { Skeleton } from "moti/skeleton";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
} from "react-native-reanimated";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";
import { format, isToday, isTomorrow, isYesterday, addDays } from "date-fns";

import { ProgressBar } from "@/components/ProgressBar";
import { TaskItem } from "@/components/TaskItem";
import { projectService } from "@/services/projectService";
import { taskService } from "@/services/taskService";
import { useToast } from "@/contexts/ToastContext";
import Colors from "@/constants/Colors";

const { width, height } = Dimensions.get("window");
const HEADER_MAX_HEIGHT = 120;
const HEADER_MIN_HEIGHT = 60;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { showToast } = useToast();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["25%", "50%", "75%"], []);

  // State
  const [expandedSections, setExpandedSections] = useState({
    todo: true,
    inProgress: true,
    done: false,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any>({
    todo: [],
    inProgress: [],
    done: [],
  });
  const [stats, setStats] = useState({
    completed: 0,
    total: 0,
    overdue: 0,
    upcoming: 0,
    today: 0,
    thisWeek: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [greeting, setGreeting] = useState("");
  const [showQuickStats, setShowQuickStats] = useState(true);

  // Animation values
  const scrollY = useSharedValue(0);
  const searchBarOpacity = useSharedValue(0);
  const fabScale = useSharedValue(1);
  const fabRotation = useSharedValue(0);
  const headerHeight = useSharedValue(HEADER_MIN_HEIGHT);
  const todoRotation = useRef(
    new Animated.Value(expandedSections.todo ? 1 : 0)
  ).current;
  const inProgressRotation = useRef(
    new Animated.Value(expandedSections.inProgress ? 1 : 0)
  ).current;
  const doneRotation = useRef(
    new Animated.Value(expandedSections.done ? 1 : 0)
  ).current;

  // Calculate rotation for each section
  const todoRotateZ = todoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const inProgressRotateZ = inProgressRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const doneRotateZ = doneRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // Animated styles
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE],
      [0, -HEADER_SCROLL_DISTANCE],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE * 0.8],
      [1, 0],
      Extrapolate.CLAMP
    );

    const scale = interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE],
      [1, 0.9],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateY }, { scale }],
      opacity,
      height: headerHeight.value,
    };
  });

  const searchBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: searchBarOpacity.value,
      transform: [
        {
          translateY: interpolate(
            searchBarOpacity.value,
            [0, 1],
            [-20, 0],
            Extrapolate.CLAMP
          ),
        },
      ],
      top: interpolate(
        headerHeight.value,
        [HEADER_MIN_HEIGHT, HEADER_MAX_HEIGHT],
        [HEADER_MIN_HEIGHT - 10, 10],
        Extrapolate.CLAMP
      ),
    };
  });

  const fabAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: fabScale.value },
        { rotate: `${fabRotation.value * 45}deg` }, // Rotate from 0 to 45 degrees
      ],
    };
  });

  const titleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HEADER_SCROLL_DISTANCE * 0.4, HEADER_SCROLL_DISTANCE * 0.9],
      [0, 1],
      Extrapolate.CLAMP
    );

    return {
      opacity,
    };
  });

  const collapsibleHeaderAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: headerHeight.value,
    };
  });

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  }, []);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Filter tasks when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTasks([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const allTasks = [...tasks.todo, ...tasks.inProgress, ...tasks.done];
    const filtered = allTasks.filter((task) =>
      task.title.toLowerCase().includes(query)
    );
    setFilteredTasks(filtered);
  }, [searchQuery, tasks]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get all projects
      const allProjects = await projectService.getProjects();
      setProjects(allProjects || []);

      // Use the most recently updated project as the current project
      if (allProjects && allProjects.length > 0) {
        const sortedProjects = [...allProjects].sort(
          (a, b) =>
            new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime()
        );

        const project = sortedProjects[0];
        setCurrentProject(project);

        // Validate project ID before getting tasks
        const projectId = project.$id
        if (!projectId || projectId.trim() === '') {
          console.warn('loadData: project has no valid ID:', project)
          return
        }

        // Get tasks for this project
        const projectTasks = await taskService.getTasksByProject(projectId);

        // Organize tasks by status
        const todoTasks = projectTasks.filter((task) => task.status === "todo");
        const inProgressTasks = projectTasks.filter(
          (task) => task.status === "inProgress"
        );
        const doneTasks = projectTasks.filter((task) => task.status === "done");

        setTasks({
          todo: todoTasks,
          inProgress: inProgressTasks,
          done: doneTasks,
        });

        // Calculate stats
        const now = new Date();
        const overdueTasks = projectTasks.filter(
          (task) => task.status !== "done" && task.due_date && new Date(task.due_date) < now
        );
        const upcomingTasks = projectTasks.filter(
          (task) =>
            task.status !== "done" &&
            task.due_date &&
            new Date(task.due_date) >= now &&
            new Date(task.due_date) <=
              new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        );

        setStats({
          completed: doneTasks.length,
          total: projectTasks.length,
          overdue: overdueTasks.length,
          upcoming: upcomingTasks.length,
          today: 0,
          thisWeek: 0,
        });
      }
    } catch (error) {
      console.error("Error loading home data:", error);
      showToast("Failed to load data", { type: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    const newValue = !expandedSections[section];
    setExpandedSections({
      ...expandedSections,
      [section]: newValue,
    });

    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate the chevron rotation
    const rotationValue =
      section === "todo"
        ? todoRotation
        : section === "inProgress"
        ? inProgressRotation
        : doneRotation;

    Animated.timing(rotationValue, {
      toValue: newValue ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleTaskPress = (taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/task/${taskId}`);
  };

  const handleProjectPress = () => {
    if (currentProject) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/project/${currentProject.$id}`);
    }
  };

  const handleAddTask = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentProject) {
      const projectId = currentProject.$id
      if (!projectId) {
        console.error('Current project has no valid ID:', currentProject)
        showToast("Invalid project ID", { type: "error" })
        return
      }
      router.push({
        pathname: "/add-task",
        params: { projectId },
      });
    } else {
      router.push("/new-project");
    }
  };

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fabRotation.value = withSpring(fabRotation.value === 0 ? 1 : 0, {
      damping: 10,
    });
    bottomSheetModalRef.current?.present();
  };

  const handleFabPressIn = () => {
    fabScale.value = withSpring(0.9);
  };

  const handleFabPressOut = () => {
    fabScale.value = withSpring(1);
  };

  const handleSearchPress = () => {
    setIsSearching(true);
    searchBarOpacity.value = withTiming(1, { duration: 300 });
    headerHeight.value = withTiming(HEADER_MAX_HEIGHT, { duration: 300 });
  };

  const handleCloseSearch = () => {
    searchBarOpacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(setIsSearching)(false);
      runOnJS(setSearchQuery)("");
    });
    headerHeight.value = withTiming(HEADER_MIN_HEIGHT, { duration: 300 });
  };

  const handleChangeProject = (project: any) => {
    setCurrentProject(project);
    bottomSheetModalRef.current?.dismiss();
    const projectId = project.$id
    if (!projectId) {
      console.error('Invalid project ID:', project)
      showToast("Invalid project ID", { type: "error" })
      return
    }
    loadProjectTasks(projectId);
  };

  const loadProjectTasks = async (projectId: string) => {
    try {
      // Validate projectId
      if (!projectId || projectId.trim() === '') {
        console.warn('loadProjectTasks: projectId is empty or invalid')
        return
      }
      
      setLoading(true);
      const projectTasks = await taskService.getTasksByProject(projectId);

      // Organize tasks by status
      const todoTasks = projectTasks.filter((task) => task.status === "todo");
      const inProgressTasks = projectTasks.filter(
        (task) => task.status === "inProgress"
      );
      const doneTasks = projectTasks.filter((task) => task.status === "done");

      setTasks({
        todo: todoTasks,
        inProgress: inProgressTasks,
        done: doneTasks,
      });

      // Calculate stats
      const now = new Date();
      const overdueTasks = projectTasks.filter(
        (task) => task.status !== "done" && task.due_date && new Date(task.due_date) < now
      );
      const upcomingTasks = projectTasks.filter(
        (task) =>
          task.status !== "done" &&
          task.due_date &&
          new Date(task.due_date) >= now &&
          new Date(task.due_date) <=
            new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      );

      setStats({
        completed: doneTasks.length,
        total: projectTasks.length,
        overdue: overdueTasks.length,
        upcoming: upcomingTasks.length,
        today: 0,
        thisWeek: 0,
      });
    } catch (error) {
      console.error("Error loading project tasks:", error);
      showToast("Failed to load tasks", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    let filteredTasks: any[] = [];
    const allTasks = [...tasks.todo, ...tasks.inProgress, ...tasks.done];
    
    switch (filter) {
      case "today":
        filteredTasks = allTasks.filter(task => {
          if (!task.due_date) return false;
          const dueDate = new Date(task.due_date);
          return isToday(dueDate);
        });
        break;
      case "overdue":
        filteredTasks = allTasks.filter(task => {
          if (!task.due_date || task.status === 'done') return false;
          const dueDate = new Date(task.due_date);
          return dueDate < new Date();
        });
        break;
      case "upcoming":
        filteredTasks = allTasks.filter(task => {
          if (!task.due_date || task.status === 'done') return false;
          const dueDate = new Date(task.due_date);
          const threeDaysFromNow = addDays(new Date(), 3);
          return dueDate > new Date() && dueDate <= threeDaysFromNow;
        });
        break;
      case "completed":
        filteredTasks = tasks.done;
        break;
      case "high":
        filteredTasks = allTasks.filter(task => task.priority === "high");
        break;
      case "medium":
        filteredTasks = allTasks.filter(task => task.priority === "medium");
        break;
      case "low":
        filteredTasks = allTasks.filter(task => task.priority === "low");
        break;
      default:
        filteredTasks = allTasks;
    }
    
    setFilteredTasks(filteredTasks);
  };

  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      <Skeleton
        colorMode={colorScheme === "dark" ? "dark" : "light"}
        width={150}
        height={20}
        radius={4}
      />
      <View style={{ height: 12 }} />
      <Skeleton
        colorMode={colorScheme === "dark" ? "dark" : "light"}
        width="100%"
        height={40}
        radius={4}
      />
      <View style={{ height: 12 }} />
      <Skeleton
        colorMode={colorScheme === "dark" ? "dark" : "light"}
        width="100%"
        height={40}
        radius={4}
      />
    </View>
  );

  const renderProjectItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.projectItem,
        {
          backgroundColor:
            item.$id === currentProject?.$id ? theme.tintLight : "transparent",
          borderColor:
            item.$id === currentProject?.$id ? theme.tint : theme.border,
        },
      ]}
      onPress={() => handleChangeProject(item)}
    >
      <View style={styles.projectItemContent}>
        <Text
          style={[styles.projectItemName, { color: theme.text }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          style={[styles.projectItemDescription, { color: theme.textDim }]}
          numberOfLines={1}
        >
          {item.description || "No description"}
        </Text>
      </View>
      <View
        style={[
          styles.projectItemProgress,
          { backgroundColor: theme.background },
        ]}
      >
        <Text style={[styles.projectItemProgressText, { color: theme.tint }]}>
          {item.progress}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSearchResults = () => {
    if (searchQuery.trim() === "") {
      return null;
    }

    return (
      <View
        style={[
          styles.searchResults,
          { backgroundColor: theme.cardBackground },
        ]}
      >
        <Text style={[styles.searchResultsTitle, { color: theme.text }]}>
          {filteredTasks.length} result{filteredTasks.length !== 1 ? "s" : ""}
        </Text>
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskItem
              key={task.$id}
              task={{
                id: task.$id,
                title: task.title,
                due_date: task.due_date || new Date().toISOString(),
                priority: task.priority,
              }}
              status="todo"
            />
          ))
        ) : (
          <View style={styles.emptySearchResults}>
            <Ionicons name="search-outline" size={40} color={theme.textDim} />
            <Text
              style={[styles.emptySearchResultsText, { color: theme.textDim }]}
            >
              No tasks found matching "{searchQuery}"
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Calculate enhanced stats
  const calculateEnhancedStats = useCallback(() => {
    const allTasks = [...tasks.todo, ...tasks.inProgress, ...tasks.done];
    const today = new Date();
    const thisWeek = addDays(today, 7);

    const todayTasks = allTasks.filter(task => {
      if (!task.due_date) return false;
      const dueDate = new Date(task.due_date);
      return isToday(dueDate);
    });

    const thisWeekTasks = allTasks.filter(task => {
      if (!task.due_date) return false;
      const dueDate = new Date(task.due_date);
      return dueDate <= thisWeek && dueDate >= today;
    });

    const overdueTasks = allTasks.filter(task => {
      if (!task.due_date || task.status === 'done') return false;
      const dueDate = new Date(task.due_date);
      return dueDate < today;
    });

    const upcomingTasks = allTasks.filter(task => {
      if (!task.due_date || task.status === 'done') return false;
      const dueDate = new Date(task.due_date);
      return dueDate > today && dueDate <= addDays(today, 3);
    });

    setStats({
      completed: tasks.done.length,
      total: allTasks.length,
      overdue: overdueTasks.length,
      upcoming: upcomingTasks.length,
      today: todayTasks.length,
      thisWeek: thisWeekTasks.length,
    });
  }, [tasks]);

  useEffect(() => {
    calculateEnhancedStats();
  }, [calculateEnhancedStats]);

  const renderQuickStats = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500, delay: 300 }}
      style={styles.quickStatsContainer}
    >
      <View style={styles.quickStatsHeader}>
        <Text style={[styles.quickStatsTitle, { color: theme.text }]}>
          Quick Overview
        </Text>
        <TouchableOpacity
          onPress={() => setShowQuickStats(!showQuickStats)}
          style={styles.toggleStatsButton}
        >
          <Ionicons 
            name={showQuickStats ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={theme.textDim} 
          />
        </TouchableOpacity>
      </View>
      
      {showQuickStats && (
        <MotiView
          from={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "timing", duration: 300 }}
          style={{ overflow: "hidden" }}
        >
          <View style={[styles.quickStatsGrid, { backgroundColor: theme.cardBackground }]}>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: theme.tintLight }]}
              onPress={() => setSelectedFilter("today")}
              activeOpacity={0.7}
            >
              <Ionicons name="today-outline" size={24} color={theme.tint} />
              <Text style={[styles.statValue, { color: theme.tint }]}>{stats.today}</Text>
              <Text style={[styles.statLabel, { color: theme.textDim }]}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: stats.overdue > 0 ? "#FFE5E5" : theme.tintLight }]}
              onPress={() => setSelectedFilter("overdue")}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="warning-outline" 
                size={24} 
                color={stats.overdue > 0 ? "#FF4444" : theme.tint} 
              />
              <Text style={[styles.statValue, { color: stats.overdue > 0 ? "#FF4444" : theme.tint }]}>
                {stats.overdue}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textDim }]}>Overdue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: theme.tintLight }]}
              onPress={() => setSelectedFilter("upcoming")}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={24} color={theme.tint} />
              <Text style={[styles.statValue, { color: theme.tint }]}>{stats.upcoming}</Text>
              <Text style={[styles.statLabel, { color: theme.textDim }]}>Upcoming</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: "#E8F5E8" }]}
              onPress={() => setSelectedFilter("completed")}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
              <Text style={[styles.statValue, { color: "#4CAF50" }]}>{stats.completed}</Text>
              <Text style={[styles.statLabel, { color: theme.textDim }]}>Completed</Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      )}
    </MotiView>
  );

  const formatTaskDate = (dateString: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    
    if (isToday(date)) {
      return "Today";
    } else if (isTomorrow(date)) {
      return "Tomorrow";
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else if (date < today) {
      return `Overdue - ${format(date, 'MMM d')}`;
    } else {
      return format(date, 'MMM d');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#FF4444';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#4CAF50';
      default:
        return theme.textDim;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'flag';
      case 'medium':
        return 'flag-outline';
      case 'low':
        return 'flag-outline';
      default:
        return 'flag-outline';
    }
  };

  const handleTaskComplete = async (taskId: string, currentStatus: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Animate the task completion
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';
      await taskService.updateTask(taskId, { status: newStatus });
      
      // Refresh data
      await loadData();
      
      showToast(
        newStatus === 'done' ? 'Task completed!' : 'Task marked as incomplete',
        { type: 'success' }
      );
    } catch (error) {
      showToast('Failed to update task status', { type: 'error' });
    }
  };

  const renderEnhancedTaskItem = (task: any, status: string, index: number) => (
    <MotiView
      key={task.$id}
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{
        type: "timing",
        duration: 300,
        delay: index * 50,
      }}
      style={styles.enhancedTaskItem}
    >
      <TouchableOpacity
        style={[
          styles.taskItemContainer,
          { backgroundColor: theme.cardBackground },
          status === 'done' && { opacity: 0.7 },
        ]}
        onPress={() => handleTaskPress(task.$id)}
        activeOpacity={0.7}
      >
        <View style={styles.taskItemHeader}>
          <View style={styles.taskItemLeft}>
            <TouchableOpacity
              style={[
                styles.taskCheckbox,
                {
                  backgroundColor: status === 'done' ? theme.tint : 'transparent',
                  borderColor: status === 'done' ? theme.tint : theme.border,
                },
              ]}
              onPress={() => handleTaskComplete(task.$id, status)}
            >
              {status === 'done' && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </TouchableOpacity>
            
            <View style={styles.taskItemContent}>
              <Text
                style={[
                  styles.taskItemTitle,
                  { color: theme.text },
                  status === 'done' && { textDecorationLine: 'line-through' },
                ]}
                numberOfLines={2}
              >
                {task.title}
              </Text>
              
              {task.due_date && (
                <View style={styles.taskItemDate}>
                  <Ionicons name="calendar-outline" size={12} color={theme.textDim} />
                  <Text style={[styles.taskItemDateText, { color: theme.textDim }]}>
                    {formatTaskDate(task.due_date)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.taskItemRight}>
            {task.priority && (
              <View style={styles.priorityIndicator}>
                <Ionicons
                  name={getPriorityIcon(task.priority)}
                  size={16}
                  color={getPriorityColor(task.priority)}
                />
              </View>
            )}
            
            <View style={[
              styles.statusIndicator,
              {
                backgroundColor: 
                  status === 'todo' ? '#FFE5E5' :
                  status === 'inProgress' ? '#FFF3E0' :
                  '#E8F5E8'
              }
            ]}>
              <Text style={[
                styles.statusText,
                {
                  color:
                    status === 'todo' ? '#FF4444' :
                    status === 'inProgress' ? '#FF9800' :
                    '#4CAF50'
                }
              ]}>
                {status === 'todo' ? 'To Do' :
                 status === 'inProgress' ? 'In Progress' :
                 'Done'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </MotiView>
  );

  if (loading && !refreshing) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: 500 }}
        >
          <ActivityIndicator size="large" color={theme.tint} />
        </MotiView>
        <MotiText
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 200 }}
          style={[styles.loadingText, { color: theme.text }]}
        >
          Loading your workspace...
        </MotiText>
      </View>
    );
  }

  if (!currentProject) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: theme.background }]}
      >
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 15 }}
        >
          <Ionicons
            name="folder-open-outline"
            size={80}
            color={theme.textDim}
          />
        </MotiView>
        <MotiText
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 200 }}
          style={[styles.emptyText, { color: theme.text }]}
        >
          No projects yet
        </MotiText>
        <MotiText
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 400 }}
          style={[styles.emptySubtext, { color: theme.textDim }]}
        >
          Create your first project to get started
        </MotiText>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 600 }}
        >
          <TouchableOpacity
            style={[
              styles.createProjectButton,
              { backgroundColor: theme.tint },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/new-project");
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createProjectButtonText}>Create Project</Text>
          </TouchableOpacity>
        </MotiView>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Collapsible Header */}
          <Animated.View
            style={[
              styles.collapsibleHeader,
              {
                backgroundColor: theme.background,
                borderBottomColor: theme.border,
              },
              collapsibleHeaderAnimatedStyle,
              titleAnimatedStyle,
            ]}
          >
            <View style={styles.headerTitleContainer}>
              <Text
                style={[styles.headerTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {currentProject.name}
              </Text>
              <TouchableOpacity
                onPress={handleSearchPress}
                style={styles.searchButton}
              >
                <Ionicons name="search-outline" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Search Bar */}
          {isSearching && (
            <Animated.View
              style={[
                styles.searchBarContainer,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
                searchBarAnimatedStyle,
              ]}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={theme.textDim}
                style={styles.searchIcon}
              />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search tasks..."
                placeholderTextColor={theme.textDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity
                onPress={handleCloseSearch}
                style={styles.closeSearchButton}
              >
                <Ionicons name="close-circle" size={20} color={theme.textDim} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Main Content */}
          {searchQuery.trim() !== "" ? (
            renderSearchResults()
          ) : (
            <Animated.ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.tint}
                  colors={[theme.tint]}
                />
              }
              scrollEventThrottle={16}
              onScroll={(event) => {
                scrollY.value = event.nativeEvent.contentOffset.y;
              }}
            >
              {/* Header Card */}
              <Animated.View
                style={[styles.headerContainer, headerAnimatedStyle]}
              >
                <Pressable
                  onPress={handleProjectPress}
                  style={styles.headerPressable}
                >
                  <LinearGradient
                    colors={[theme.tint, theme.tint]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                  >
                    <MotiView
                      from={{ opacity: 0, translateY: 10 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ type: "timing", duration: 500 }}
                    >
                      <Text
                        style={[
                          styles.greeting,
                          { color: "rgba(255,255,255,0.9)" },
                        ]}
                      >
                        {greeting}
                      </Text>
                      <Text style={[styles.projectName, { color: "#fff" }]}>
                        {currentProject.name}
                      </Text>
                    </MotiView>
                    <MotiView
                      from={{ opacity: 0, translateY: 10 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ type: "timing", duration: 500, delay: 100 }}
                    >
                      <Text
                        style={[
                          styles.projectDescription,
                          { color: "rgba(255,255,255,0.8)" },
                        ]}
                      >
                        {currentProject.description ||
                          "No description provided"}
                      </Text>
                    </MotiView>

                    <MotiView
                      from={{ opacity: 0, translateY: 10 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ type: "timing", duration: 500, delay: 200 }}
                      style={styles.progressContainer}
                    >
                      <View style={styles.progressHeader}>
                        <Text style={[styles.progressTitle, { color: "#fff" }]}>
                          Project Progress
                        </Text>
                        <View
                          style={[
                            styles.progressPercentageContainer,
                            { backgroundColor: "rgba(255,255,255,0.2)" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.progressPercentage,
                              { color: "#fff" },
                            ]}
                          >
                            {currentProject.progress}%
                          </Text>
                        </View>
                      </View>
                      <ProgressBar progress={currentProject.progress} />
                    </MotiView>

                    <MotiView
                      from={{ opacity: 0, translateY: 10 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ type: "timing", duration: 500, delay: 300 }}
                      style={styles.dateContainer}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="rgba(255,255,255,0.8)"
                      />
                      <Text
                        style={[
                          styles.dateText,
                          { color: "rgba(255,255,255,0.8)" },
                        ]}
                      >
                        {format(new Date(), "EEEE, MMMM d")}
                      </Text>
                    </MotiView>
                  </LinearGradient>
                </Pressable>
              </Animated.View>

              {/* Quick Stats */}
              {renderQuickStats()}

              {/* Stats Cards */}
              <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 500, delay: 300 }}
                style={styles.statsContainer}
              >
                <View
                  style={[
                    styles.statsCard,
                    { backgroundColor: theme.cardBackground },
                  ]}
                >
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {stats.total}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textDim }]}>
                      Total
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: theme.border },
                    ]}
                  />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.success }]}>
                      {stats.completed}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textDim }]}>
                      Done
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: theme.border },
                    ]}
                  />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.error }]}>
                      {stats.overdue}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textDim }]}>
                      Overdue
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: theme.border },
                    ]}
                  />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.warning }]}>
                      {stats.upcoming}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textDim }]}>
                      Upcoming
                    </Text>
                  </View>
                </View>
              </MotiView>

              {/* Filter Buttons */}
              <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 500, delay: 400 }}
                style={styles.filterContainer}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterScroll}
                >
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor:
                          selectedFilter === "all"
                            ? theme.tint
                            : theme.cardBackground,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => handleFilterChange("all")}
                  >
                    <Ionicons
                      name="apps-outline"
                      size={16}
                      color={
                        selectedFilter === "all" ? "#fff" : theme.textDim
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.filterText,
                        {
                          color:
                            selectedFilter === "all" ? "#fff" : theme.textDim,
                        },
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor:
                          selectedFilter === "today"
                            ? theme.tint
                            : theme.cardBackground,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => handleFilterChange("today")}
                  >
                    <Ionicons
                      name="today-outline"
                      size={16}
                      color={
                        selectedFilter === "today" ? "#fff" : theme.textDim
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.filterText,
                        {
                          color:
                            selectedFilter === "today" ? "#fff" : theme.textDim,
                        },
                      ]}
                    >
                      Today
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor:
                          selectedFilter === "overdue"
                            ? "#FF4444"
                            : theme.cardBackground,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => handleFilterChange("overdue")}
                  >
                    <Ionicons
                      name="warning-outline"
                      size={16}
                      color={
                        selectedFilter === "overdue" ? "#fff" : "#FF4444"
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.filterText,
                        {
                          color:
                            selectedFilter === "overdue" ? "#fff" : "#FF4444",
                        },
                      ]}
                    >
                      Overdue
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor:
                          selectedFilter === "upcoming"
                            ? theme.tint
                            : theme.cardBackground,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => handleFilterChange("upcoming")}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={
                        selectedFilter === "upcoming" ? "#fff" : theme.textDim
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.filterText,
                        {
                          color:
                            selectedFilter === "upcoming" ? "#fff" : theme.textDim,
                        },
                      ]}
                    >
                      Upcoming
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor:
                          selectedFilter === "high"
                            ? theme.tint
                            : theme.cardBackground,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => handleFilterChange("high")}
                  >
                    <Ionicons
                      name="flag-outline"
                      size={16}
                      color={
                        selectedFilter === "high" ? "#fff" : theme.textDim
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.filterText,
                        {
                          color:
                            selectedFilter === "high" ? "#fff" : theme.textDim,
                        },
                      ]}
                    >
                      High Priority
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </MotiView>

              {/* Task Sections */}
              <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 500, delay: 500 }}
                style={styles.milestones}
              >
                <View style={styles.sectionTitleContainer}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Tasks
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.addTaskButton,
                      { backgroundColor: theme.tintLight },
                    ]}
                    onPress={handleAddTask}
                  >
                    <Ionicons name="add" size={16} color={theme.tint} />
                    <Text style={[styles.addTaskText, { color: theme.tint }]}>
                      Add Task
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* To Do Section */}
                <MotiView
                  from={{ opacity: 0, translateY: 20, scale: 0.95 }}
                  animate={{ opacity: 1, translateY: 0, scale: 1 }}
                  transition={{ type: "timing", duration: 500, delay: 600 }}
                  style={[
                    styles.taskSection,
                    { backgroundColor: theme.cardBackground },
                  ]}
                >
                  <Pressable
                    style={styles.sectionHeader}
                    onPress={() => toggleSection("todo")}
                    android_ripple={{ color: theme.ripple }}
                  >
                    <View style={styles.sectionHeaderLeft}>
                      <Ionicons
                        name="ellipse-outline"
                        size={20}
                        color={theme.text}
                      />
                      <Text
                        style={[
                          styles.sectionHeaderText,
                          { color: theme.text },
                        ]}
                      >
                        To Do
                      </Text>
                      <View
                        style={[
                          styles.taskCount,
                          { backgroundColor: theme.tintLight },
                        ]}
                      >
                        <Text
                          style={[styles.taskCountText, { color: theme.tint }]}
                        >
                          {tasks.todo.length}
                        </Text>
                      </View>
                    </View>
                    <Animated.View
                      style={{ transform: [{ rotateZ: todoRotateZ }] }}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={theme.text}
                      />
                    </Animated.View>
                  </Pressable>

                  <AnimatePresence>
                    {expandedSections.todo && (
                      <MotiView
                        from={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "timing", duration: 300 }}
                        style={{ overflow: "hidden" }}
                      >
                        {refreshing ? (
                          renderSkeleton()
                        ) : tasks.todo.length > 0 ? (
                          tasks.todo.map((task: any, index: number) => 
                            renderEnhancedTaskItem(task, 'todo', index)
                          )
                        ) : (
                          <View style={styles.emptyTasksContainer}>
                            <Text
                              style={[
                                styles.emptyTasksText,
                                { color: theme.textDim },
                              ]}
                            >
                              No tasks to do
                            </Text>
                          </View>
                        )}
                      </MotiView>
                    )}
                  </AnimatePresence>
                </MotiView>

                {/* In Progress Section */}
                <MotiView
                  from={{ opacity: 0, translateY: 20, scale: 0.95 }}
                  animate={{ opacity: 1, translateY: 0, scale: 1 }}
                  transition={{ type: "timing", duration: 500, delay: 700 }}
                  style={[
                    styles.taskSection,
                    { backgroundColor: theme.cardBackground },
                  ]}
                >
                  <Pressable
                    style={styles.sectionHeader}
                    onPress={() => toggleSection("inProgress")}
                    android_ripple={{ color: theme.ripple }}
                  >
                    <View style={styles.sectionHeaderLeft}>
                      <Ionicons name="time-outline" size={20} color="#FF9800" />
                      <Text
                        style={[
                          styles.sectionHeaderText,
                          { color: theme.text },
                        ]}
                      >
                        In Progress
                      </Text>
                      <View
                        style={[
                          styles.taskCount,
                          { backgroundColor: theme.tintLight },
                        ]}
                      >
                        <Text
                          style={[styles.taskCountText, { color: theme.tint }]}
                        >
                          {tasks.inProgress.length}
                        </Text>
                      </View>
                    </View>
                    <Animated.View
                      style={{ transform: [{ rotateZ: inProgressRotateZ }] }}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={theme.text}
                      />
                    </Animated.View>
                  </Pressable>

                  <AnimatePresence>
                    {expandedSections.inProgress && (
                      <MotiView
                        from={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "timing", duration: 300 }}
                        style={{ overflow: "hidden" }}
                      >
                        {refreshing ? (
                          renderSkeleton()
                        ) : tasks.inProgress.length > 0 ? (
                          tasks.inProgress.map((task: any, index: number) => 
                            renderEnhancedTaskItem(task, 'inProgress', index)
                          )
                        ) : (
                          <View style={styles.emptyTasksContainer}>
                            <Text
                              style={[
                                styles.emptyTasksText,
                                { color: theme.textDim },
                              ]}
                            >
                              No tasks in progress
                            </Text>
                          </View>
                        )}
                      </MotiView>
                    )}
                  </AnimatePresence>
                </MotiView>

                {/* Done Section */}
                <MotiView
                  from={{ opacity: 0, translateY: 20, scale: 0.95 }}
                  animate={{ opacity: 1, translateY: 0, scale: 1 }}
                  transition={{ type: "timing", duration: 500, delay: 800 }}
                  style={[
                    styles.taskSection,
                    { backgroundColor: theme.cardBackground },
                  ]}
                >
                  <Pressable
                    style={styles.sectionHeader}
                    onPress={() => toggleSection("done")}
                    android_ripple={{ color: theme.ripple }}
                  >
                    <View style={styles.sectionHeaderLeft}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4CAF50"
                      />
                      <Text
                        style={[
                          styles.sectionHeaderText,
                          { color: theme.text },
                        ]}
                      >
                        Done
                      </Text>
                      <View
                        style={[
                          styles.taskCount,
                          { backgroundColor: theme.tintLight },
                        ]}
                      >
                        <Text
                          style={[styles.taskCountText, { color: theme.tint }]}
                        >
                          {tasks.done.length}
                        </Text>
                      </View>
                    </View>
                    <Animated.View
                      style={{ transform: [{ rotateZ: doneRotateZ }] }}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={theme.text}
                      />
                    </Animated.View>
                  </Pressable>

                  <AnimatePresence>
                    {expandedSections.done && (
                      <MotiView
                        from={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "timing", duration: 300 }}
                        style={{ overflow: "hidden" }}
                      >
                        {refreshing ? (
                          renderSkeleton()
                        ) : tasks.done.length > 0 ? (
                          tasks.done.map((task: any, index: number) => 
                            renderEnhancedTaskItem(task, 'done', index)
                          )
                        ) : (
                          <View style={styles.emptyTasksContainer}>
                            <Text
                              style={[
                                styles.emptyTasksText,
                                { color: theme.textDim },
                              ]}
                            >
                              No completed tasks
                            </Text>
                          </View>
                        )}
                      </MotiView>
                    )}
                  </AnimatePresence>
                </MotiView>
              </MotiView>

              {/* Add some space at the bottom for the FAB */}
              <View style={{ height: 80 }} />
            </Animated.ScrollView>
          )}

          {/* Floating Action Button */}
          <Animated.View style={[styles.fabContainer, fabAnimatedStyle]}>
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: theme.tint }]}
              onPress={handleFabPress}
              onPressIn={handleFabPressIn}
              onPressOut={handleFabPressOut}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </Animated.View>

          {/* Bottom Sheet Modal */}
          <BottomSheetModal
            ref={bottomSheetModalRef}
            index={0}
            snapPoints={snapPoints}
            backgroundStyle={{ backgroundColor: theme.cardBackground }}
            handleIndicatorStyle={{ backgroundColor: theme.textDim }}
          >
            <View style={styles.bottomSheetContent}>
              <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>
                Quick Actions
              </Text>

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: theme.tintLight },
                  ]}
                  onPress={handleAddTask}
                >
                  <Ionicons name="add-circle" size={24} color={theme.tint} />
                  <Text
                    style={[styles.actionButtonText, { color: theme.text }]}
                  >
                    Add Task
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: theme.tintLight },
                  ]}
                  onPress={() => {
                    bottomSheetModalRef.current?.dismiss();
                    router.push("/new-project");
                  }}
                >
                  <Ionicons name="folder-open" size={24} color={theme.tint} />
                  <Text
                    style={[styles.actionButtonText, { color: theme.text }]}
                  >
                    New Project
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: theme.tintLight },
                  ]}
                  onPress={() => {
                    bottomSheetModalRef.current?.dismiss();
                    handleProjectPress();
                  }}
                >
                  <Ionicons name="stats-chart" size={24} color={theme.tint} />
                  <Text
                    style={[styles.actionButtonText, { color: theme.text }]}
                  >
                    Project Details
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.bottomSheetSubtitle, { color: theme.text }]}>
                Switch Project
              </Text>

              <FlatList
                data={projects}
                renderItem={renderProjectItem}
                keyExtractor={(item) => item.$id || item.id}
                style={styles.projectsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            </View>
          </BottomSheetModal>
        </View>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    maxWidth: 300,
  },
  createProjectButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  createProjectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  collapsibleHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MIN_HEIGHT,
    zIndex: 1000,
    justifyContent: "flex-end",
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  searchButton: {
    padding: 8,
  },
  searchBarContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 50,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 1001,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  closeSearchButton: {
    padding: 8,
  },
  searchResults: {
    flex: 1,
    marginTop: HEADER_MAX_HEIGHT + 20,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: "600",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  emptySearchResults: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySearchResultsText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
  },
  headerContainer: {
    marginHorizontal: 16,
    marginTop: HEADER_MIN_HEIGHT + 20,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerPressable: {
    width: "100%",
  },
  headerGradient: {
    padding: 20,
    borderRadius: 24,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  projectName: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 16,
    marginTop: 4,
    marginBottom: 20,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  progressPercentageContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: "bold",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  dateText: {
    fontSize: 14,
    marginLeft: 6,
  },
  statsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  statsCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: "80%",
    alignSelf: "center",
  },
  filterContainer: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  filterScroll: {
    flexDirection: "row",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  milestones: {
    padding: 16,
    paddingTop: 24,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  addTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addTaskText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  taskSection: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  taskCount: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  taskCountText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyTasksContainer: {
    padding: 16,
    alignItems: "center",
  },
  emptyTasksText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 1000,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomSheetContent: {
    flex: 1,
    padding: 16,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  bottomSheetSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 16,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  actionButton: {
    width: "30%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  actionButtonText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  projectsList: {
    flex: 1,
  },
  projectItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  projectItemContent: {
    flex: 1,
  },
  projectItemName: {
    fontSize: 16,
    fontWeight: "600",
  },
  projectItemDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  projectItemProgress: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  projectItemProgressText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  quickStatsContainer: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  quickStatsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  quickStatsTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  toggleStatsButton: {
    padding: 8,
  },
  quickStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
  },
  enhancedTaskItem: {
    marginBottom: 16,
  },
  taskItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
  },
  taskItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  taskItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  taskItemTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  taskItemDate: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  taskItemDateText: {
    marginLeft: 4,
    fontSize: 12,
  },
  taskItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  priorityIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  statusIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
});
