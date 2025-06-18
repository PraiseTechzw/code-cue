import { Client, Account, Databases, Storage } from 'appwrite';
import AsyncStorage from "@react-native-async-storage/async-storage";

// Appwrite configuration
const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || 'your-project-id';

// Initialize Appwrite client
export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Database and collection IDs
export const DATABASE_ID = 'code-cue-db';
export const COLLECTIONS = {
  PROFILES: 'profiles',
  PROJECTS: 'projects',
  TASKS: 'tasks',
  SUBTASKS: 'subtasks',
  COMMENTS: 'comments',
  NOTIFICATIONS: 'notifications',
  GITHUB_REPOSITORIES: 'github_repositories',
  GITHUB_COMMITS: 'github_commits',
  GITHUB_CONNECTIONS: 'github_connections'
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

// Configure account with custom storage
account.setSessionStorage(customStorage); 