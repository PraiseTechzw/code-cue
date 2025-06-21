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
  PHASES: '68569600002adc8cc0c0'
};

// Custom storage adapter for React Native
export const customStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in storage:', error);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  }
}; 