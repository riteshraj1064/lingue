// services/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constant/constant";

export interface SelectedCourse {
  courseId: string;
  courseSlug: string;
  fromLanguageId: string;
  fromLanguageCode: string;
  fromLanguageName: string;
  targetLanguageId: string;
  targetLanguageCode: string;
  targetLanguageName: string;
  selectedAt: string;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  token: string;
}

export const storageService = {
  // Course Storage
  async getSelectedCourse(): Promise<SelectedCourse | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_COURSE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Error reading selected course:", e);
      return null;
    }
  },

  async saveSelectedCourse(course: SelectedCourse): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_COURSE, JSON.stringify(course));
    } catch (e) {
      console.error("Error saving selected course:", e);
    }
  },

  async clearSelectedCourse(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_COURSE);
    } catch (e) {
      console.error("Error clearing selected course:", e);
    }
  },

  // Auth Session Storage
  async getSession(): Promise<UserSession | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Error reading session:", e);
      return null;
    }
  },

  async saveSession(session: UserSession): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
    } catch (e) {
      console.error("Error saving session:", e);
    }
  },

  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    } catch (e) {
      console.error("Error clearing session:", e);
    }
  },

  // Daily Goal Storage
  async getDailyGoal(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.DAILY_GOAL);
    } catch (e) {
      return null;
    }
  },

  async saveDailyGoal(goalId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_GOAL, goalId);
    } catch (e) {
      console.error("Error saving daily goal:", e);
    }
  },

  // Clear everything for testing/reset
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.error("Error clearing storage:", e);
    }
  },
};
