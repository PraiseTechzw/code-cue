import { Client, Account, Databases, Storage } from 'appwrite';
import AsyncStorage from "@react-native-async-storage/async-storage";

// Appwrite configuration
const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '6852cd880027fb6d1f60';

// Initialize Appwrite client
export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Database and collection IDs
export const DATABASE_ID = '6852cefa002e1a642ce3'; // code-cue-db
export const COLLECTIONS = {
  PROFILES: "profiles",
  PROJECTS: "projects",
  TASKS: "tasks",
  PHASES: "phases",
  SUBTASKS: "subtasks",
  COMMENTS: "comments",
  NOTIFICATIONS: "notifications",
  GITHUB_REPOSITORIES: "github_repositories",
  GITHUB_COMMITS: "github_commits",
  GITHUB_CONNECTIONS: "github_connections",
  // New collections for advanced features
  TEAM_MEMBERS: "6856a20f000adc963119",
  PROJECT_ACTIVITIES: "project_activities",
  WORKFLOW_AUTOMATIONS: "workflow_automations",
  PROJECT_TEMPLATES: "project_templates",
  TIME_ENTRIES: "time_entries",
  PROJECT_REPORTS: "project_reports",
  PROJECT_BUDGETS: "project_budgets",
  PROJECT_SETTINGS: "6856a692003cbc14314e",
} as const

// Collection ID mapping for easy reference
export const COLLECTION_IDS = {
  PROFILES: '6852cf11003554d32ea9',
  PROJECTS: '6852cfd0002f57ec58c2',
  TASKS: '6852d0530022872d4b42',
  SUBTASKS: '6852d0d60003950f81c8',
  COMMENTS: '6852d10d001628aa199c',
  NOTIFICATIONS: '6852d1510017135f7512',
  GITHUB_REPOSITORIES: '6852d220000003fd119e',
  GITHUB_COMMITS: '6852d2e100203c24157b',
  GITHUB_CONNECTIONS: '6852d4e20022f01bc54b',
  PHASES: '68569600002adc8cc0c0',
  // New collection IDs for advanced features
  TEAM_MEMBERS: '6856a20f000adc963119', // Replace with actual ID
  PROJECT_ACTIVITIES: '6856a2980034d9194ed1', // Replace with actual ID
  WORKFLOW_AUTOMATIONS: '6856a3370013e508cf66', // Replace with actual ID
  PROJECT_TEMPLATES: '6856a3d6001dcbeff384', // Replace with actual ID
  TIME_ENTRIES: '6856a4ad002ad28dc044', // Replace with actual ID
  PROJECT_REPORTS: '6856a57500308e6f62be', // Replace with actual ID
  PROJECT_BUDGETS: '6856a5ef00027047d9f2', // Replace with actual ID
  PROJECT_SETTINGS: '6856a692003cbc14314e', // Replace with actual ID
};

// Custom storage adapter for React Native
export const customStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
    }
  }
};

export { ID, Query } from 'appwrite' 