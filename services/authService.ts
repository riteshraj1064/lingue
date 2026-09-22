// services/authService.ts
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  needsEmailConfirmation?: boolean;
}

export const authService = {
  // Sign up with name, email and password
  async signUp(name: string, email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    const needsEmailConfirmation = !data.session && !!data.user;

    return {
      user: data.user,
      session: data.session,
      needsEmailConfirmation,
    };
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      user: data.user,
      session: data.session,
    };
  },

  // Reset password email
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());

    if (error) {
      throw new Error(error.message);
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error.message);
    }
  },

  // Get current active session
  async getSession(): Promise<Session | null> {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch (e) {
      console.error("Error getting session:", e);
      return null;
    }
  },

  // Get current user
  async getUser(): Promise<User | null> {
    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch (e) {
      return null;
    }
  },
};
