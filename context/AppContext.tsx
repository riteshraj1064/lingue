
import { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  DAILY_GOALS,
  LanguageOption,
} from "../constant/constant";

const DEFAULT_TARGET_LANG: LanguageOption = {
  id: "en", name: "English", nativeName: "English", flag: "🇺🇸", code: "en", learners: "",
};
const DEFAULT_NATIVE_LANG: LanguageOption = {
  id: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", code: "hi", learners: "",
};

import { AuthResponse, authService } from "../services/authService";
import {
  fetchSubscriptionEntitlement,
  SubscriptionEntitlement,
} from "../services/razorpaySubscriptions";
import {
  SelectedCourse,
  storageService,
} from "../services/storage";

import { supabase } from "../services/supabase";

/* ============================================================
   USER STATS
============================================================ */

export interface UserStats {
  streak: number;
  gems: number;
  coins: number;
  lives: number;

  level: number;
  xp: number;
  xpMax: number;

  todayMinutes: number;
  goalMinutes: number;
}

/* ============================================================
   DEFAULT STATS
============================================================ */

export const defaultStats: UserStats = {
  streak: 0,
  gems: 0,
  coins: 0,
  lives: 5,

  level: 1,
  xp: 0,
  xpMax: 600,

  todayMinutes: 0,
  goalMinutes: 10,
};

/* ============================================================
   CONTEXT TYPE
============================================================ */

interface AppContextType {
  isLoading: boolean;

  isAuthenticated: boolean;

  session: Session | null;
  user: User | null;

  selectedCourse: SelectedCourse | null;

  selectedTargetLang: LanguageOption;
  selectedNativeLang: LanguageOption;

  selectedGoalId: string;

  stats: UserStats;

  entitlement: SubscriptionEntitlement | null;
  isPremium: boolean;
  refreshEntitlement: () => Promise<SubscriptionEntitlement | null>;

  setTargetLanguage: (lang: LanguageOption) => void;
  setNativeLanguage: (lang: LanguageOption) => void;
  setDailyGoalId: (goalId: string) => void;

  refreshStats: () => Promise<void>;

  sendOtp: (
    email: string,
    nameOrOptions?: string | { isSignUp?: boolean; name?: string }
  ) => Promise<void>;

  verifyOtp: (email: string, token: string) => Promise<AuthResponse & { courseRestored?: boolean }>;

  resetPassword: (email: string) => Promise<void>;

  logout: () => Promise<void>;

  completeOnboarding: () => Promise<void>;


  refillLives: (amount?: number) => Promise<boolean>;
  buyLivesWithGems: (
    gemCost?: number,
    livesToGive?: number
  ) => Promise<{ success: boolean; message: string }>;
  buyLivesWithCoins: (
    coinCost?: number,
    livesToGive?: number
  ) => Promise<{ success: boolean; message: string }>;
}

/* ============================================================
   CONTEXT
============================================================ */

const AppContext = createContext<AppContextType | undefined>(
  undefined
);

/* ============================================================
   PROVIDER
============================================================ */

export function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);

  const [session, setSession] = useState<Session | null>(null);

  const [user, setUser] = useState<User | null>(null);

  const [selectedCourse, setSelectedCourse] =
    useState<SelectedCourse | null>(null);

  const [selectedTargetLang, setSelectedTargetLang] =
    useState<LanguageOption>(DEFAULT_TARGET_LANG);

  const [selectedNativeLang, setSelectedNativeLang] =
    useState<LanguageOption>(DEFAULT_NATIVE_LANG);

  const [selectedGoalId, setSelectedGoalId] =
    useState<string>("regular");

  const [stats, setStats] =
    useState<UserStats>(defaultStats);

  const [entitlement, setEntitlement] =
    useState<SubscriptionEntitlement | null>(null);

  /* ==========================================================
     SYNC ENTITLEMENT WITH BACKEND & LOCAL STORAGE
  ========================================================== */

  const refreshEntitlement = useCallback(async (): Promise<SubscriptionEntitlement | null> => {
    try {
      const serverEnt = await fetchSubscriptionEntitlement(supabase);
      if (serverEnt) {
        setEntitlement(serverEnt);
        await storageService.saveSubscriptionEntitlement(serverEnt);
        return serverEnt;
      }
    } catch (e) {
      console.log("[AppContext] Could not fetch server entitlement:", e);
    }
    return null;
  }, []);

  /* ==========================================================
     LOAD INITIAL APP STATE
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const [
          savedCourse,
          initialSession,
          savedGoal,
          savedEntitlement,
        ] = await Promise.all([
          storageService.getSelectedCourse(),
          authService.getSession(),
          storageService.getDailyGoal(),
          storageService.getSubscriptionEntitlement<SubscriptionEntitlement>(),
        ]);

        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
        }

        if (savedCourse) {
          setSelectedCourse(savedCourse);
        }

        if (savedGoal) {
          setSelectedGoalId(savedGoal);
        }

        if (savedEntitlement) {
          setEntitlement(savedEntitlement);
        }

        // When app starts, fetch fresh entitlement if logged in & sync local storage
        if (initialSession?.user) {
          refreshEntitlement().catch(() => {});
        }
      } catch (error) {
        console.error(
          "[AppContext] Initial state error:",
          error
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [refreshEntitlement]);

  /* ==========================================================
     AUTH STATE LISTENER
     
     IMPORTANT:
     We ONLY update React auth state here.
     
     We do NOT call Supabase RPC inside this callback.
  ========================================================== */

  useEffect(() => {
    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        /*
         * Don't call loadStats() here.
         *
         * Supabase recommends keeping auth callback
         * lightweight and doing additional async work
         * in a separate effect.
         */
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  /* ==========================================================
     FETCH USER STATS FROM SERVER
  ========================================================== */

  const loadStats = useCallback(async (): Promise<void> => {
    try {
      /*
       * Make absolutely sure there is an authenticated user.
       */

      const {
        data: {
          user: currentUser,
        },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "[Stats] Unable to get authenticated user:",
          userError
        );

        return;
      }

      if (!currentUser) {
        console.log(
          "[Stats] No authenticated user. Using defaults."
        );

        setStats(defaultStats);

        return;
      }

      /*
       * Call server RPC.
       *
       * Do NOT use .single() here.
       *
       * We normalize the response below so this works whether
       * the RPC returns a single object or one-row array.
       */

      const {
        data,
        error,
      } = await supabase.rpc("get_user_stats");


      if (error) {
        console.error(
          "[Stats] get_user_stats RPC error:",
          error
        );

        return;
      }

      if (!data) {
        console.warn(
          "[Stats] get_user_stats returned no data."
        );

        setStats(defaultStats);

        return;
      }

      /*
       * Normalize RPC response.
       *
       * Depending on the PostgreSQL function definition,
       * Supabase can return:
       *
       * {
       *   streak: 5,
       *   gems: 100
       * }
       *
       * OR:
       *
       * [
       *   {
       *     streak: 5,
       *     gems: 100
       *   }
       * ]
       */

      const row = Array.isArray(data)
        ? data[0]
        : data;

      if (!row) {
        setStats(defaultStats);
        return;
      }

      /*
       * Convert everything to numbers.
       *
       * PostgreSQL BIGINT / NUMERIC values can sometimes arrive
       * as strings, so Number() is important.
       */

      const serverStats: UserStats = {
        streak: Number(row.streak ?? 0),

        gems: Number(row.gems ?? 0),

        coins: Number(row.xp ?? 0),

        lives: Number(row.lives ?? 5),

        level: Number(row.level ?? 1),

        xp: Number(row.xp ?? 0),

        xpMax: Number(
          row.xp_max ??
          row.xpMax ??
          600
        ),

        todayMinutes: Number(
          row.today_minutes ??
          row.todayMinutes ??
          0
        ),

        goalMinutes: Number(
          row.goal_minutes ??
          row.goalMinutes ??
          10
        ),
      };


      setStats(serverStats);
    } catch (error) {
      console.error(
        "[Stats] Failed to load user stats:",
        error
      );
    }
  }, []);

  /* ==========================================================
     PUBLIC REFRESH STATS
     
     This is useful after:
     
     - Answer submission
     - Lesson completion
     - XP reward
     - Spending gems
     - Losing a life
     - Buying something
     - Streak update
  ========================================================== */

  const refreshStats = useCallback(async (): Promise<void> => {
    await loadStats();
  }, [loadStats]);

  /* ==========================================================
     LOAD STATS WHEN USER CHANGES
     
     This fixes the main problem in the original code.
     
     Whenever login/session restoration creates a user,
     server stats are fetched automatically.
  ========================================================== */

  useEffect(() => {
    if (!user) {
      setStats(defaultStats);
      return;
    }

    loadStats();
  }, [user?.id]);

  /* ==========================================================
     LOGIN
  ========================================================== */

  const sendOtp = async (
    email: string,
    nameOrOptions?: string | { isSignUp?: boolean; name?: string }
  ): Promise<void> => {
    await authService.signInWithOtp(email, nameOrOptions);
  };

  const verifyOtp = async (
    email: string,
    token: string
  ): Promise<AuthResponse & { courseRestored?: boolean }> => {
    const res = await authService.verifyOtp(email, token);

    setSession(res.session);
    setUser(res.user);

    if (res.user) {
      try {
        const { data: courseData, error: courseError } = await supabase.rpc(
          "get_active_user_course"
        );

        if (!courseError && courseData?.hasActiveCourse) {
          const activeCourse = courseData.course;
          if (activeCourse) {
            await storageService.saveSelectedCourse(activeCourse);
            setSelectedCourse(activeCourse);
          }
          await loadStats();
          return { ...res, courseRestored: true };
        }
        await loadStats();
      } catch (error) {
        console.error("[VerifyOtp] Failed restoring user data:", error);
      }
    }
    return res;
  };

  /* ==========================================================
     RESET PASSWORD
  ========================================================== */

  const resetPassword = async (
    email: string
  ): Promise<void> => {
    await authService.resetPassword(email);
  };

  /* ==========================================================
     LOGOUT
  ========================================================== */

  const logout = async () => {
    try {
      await Promise.all([
        authService.signOut(),
        storageService.clearSelectedCourse(),
        storageService.clearSubscriptionEntitlement(),
      ]);
    } finally {
      setSession(null);
      setUser(null);
      setSelectedCourse(null);
      setEntitlement(null);

      /*
       * Important:
       * Don't keep the previous user's stats visible.
       */

      setStats(defaultStats);
    }
  };

  /* ==========================================================
     COMPLETE ONBOARDING
  ========================================================== */

  const completeOnboarding = async () => {
    const course: SelectedCourse = {
      courseId:
        `${selectedNativeLang.code}-${selectedTargetLang.code}`,

      courseSlug:
        `${selectedNativeLang.name.toLowerCase()}-to-${selectedTargetLang.name.toLowerCase()}`,

      fromLanguageId:
        selectedNativeLang.id,

      fromLanguageCode:
        selectedNativeLang.code,

      fromLanguageName:
        selectedNativeLang.name,

      targetLanguageId:
        selectedTargetLang.id,

      targetLanguageCode:
        selectedTargetLang.code,

      targetLanguageName:
        selectedTargetLang.name,

      selectedAt:
        new Date().toISOString(),
    };

    const selectedGoal = DAILY_GOALS.find(
      (goal) => goal.id === selectedGoalId
    );

    const dailyGoalMinutes =
      selectedGoal?.minutes || 10;

    const {
      data,
      error,
    } = await supabase.rpc(
      "save_user_course_setup",
      {
        p_course_code: course.courseId,

        p_native_language_id:
          course.fromLanguageId,

        p_target_language_id:
          course.targetLanguageId,

        p_daily_goal_minutes:
          dailyGoalMinutes,
      }
    );

    if (error) {
      console.error(
        "[Onboarding] save_user_course_setup:",
        error
      );

      throw error;
    }

    if (!data?.success) {
      throw new Error(
        "COURSE_SETUP_FAILED"
      );
    }

    /*
     * Save local state.
     */

    await Promise.all([
      storageService.saveSelectedCourse(
        course
      ),

      storageService.saveDailyGoal(
        selectedGoalId
      ),
    ]);

    setSelectedCourse(course);

    /*
     * VERY IMPORTANT:
     *
     * The onboarding RPC may create/update:
     *
     * - gems
     * - coins
     * - lives
     * - XP
     * - level
     * - goal
     *
     * So fetch fresh stats from PostgreSQL.
     */

    await loadStats();
  };





  /* ==========================================================
     LIVES & SHOP REFILL HELPERS
  ========================================================== */

  const refillLives = async (amount: number = 5): Promise<boolean> => {
    try {
      const currentLives = stats?.lives ?? 0;
      const newLives = Math.min(5, Math.max(1, currentLives + amount));
      const updated: UserStats = {
        ...(stats || defaultStats),
        lives: newLives,
      };
      setStats(updated);

      if (user?.id) {
        await supabase
          .from("profiles")
          .update({ lives: newLives })
          .eq("id", user.id);
      }
    } catch (err) {
      console.warn("[Lives] Failed to sync refilled lives to server:", err);
    }
    return true;
  };

  const buyLivesWithGems = async (
    gemCost: number = 20,
    livesToGive: number = 5
  ): Promise<{ success: boolean; message: string }> => {
    const currentGems = stats?.gems ?? 0;
    if (currentGems < gemCost) {
      return {
        success: false,
        message: `Not enough gems. You have ${currentGems} 💎, but need ${gemCost} 💎.`,
      };
    }

    const newGems = Math.max(0, currentGems - gemCost);
    const newLives = Math.min(5, Math.max(1, (stats?.lives ?? 0) + livesToGive));

    const updated: UserStats = {
      ...(stats || defaultStats),
      gems: newGems,
      lives: newLives,
    };
    setStats(updated);

    if (user?.id) {
      try {
        await supabase
          .from("profiles")
          .update({ gems: newGems, lives: newLives })
          .eq("id", user.id);
      } catch (err) {
        console.warn("[Shop] Failed to sync gems & lives purchase:", err);
      }
    }

    return {
      success: true,
      message: `Full refill! Added ${livesToGive} lives for ${gemCost} gems.`,
    };
  };

  const buyLivesWithCoins = async (
    coinCost: number = 50,
    livesToGive: number = 5
  ): Promise<{ success: boolean; message: string }> => {
    const currentCoins = stats?.coins ?? 0;
    if (currentCoins < coinCost) {
      return {
        success: false,
        message: `Not enough coins. You have ${currentCoins} 🪙, but need ${coinCost} 🪙.`,
      };
    }

    const newCoins = Math.max(0, currentCoins - coinCost);
    const newLives = Math.min(5, Math.max(1, (stats?.lives ?? 0) + livesToGive));

    const updated: UserStats = {
      ...(stats || defaultStats),
      coins: newCoins,
      lives: newLives,
    };
    setStats(updated);

    if (user?.id) {
      try {
        await supabase
          .from("profiles")
          .update({ lives: newLives })
          .eq("id", user.id);
      } catch (err) {
        console.warn("[Shop] Failed to sync coins & lives purchase:", err);
      }
    }

    return {
      success: true,
      message: `Full refill! Added ${livesToGive} lives for ${coinCost} coins.`,
    };
  };

  /* ==========================================================
     PROVIDER
  ========================================================== */

  return (
    <AppContext.Provider
      value={{
        isLoading,

        isAuthenticated: !!session,

        session,

        user,

        selectedCourse,

        selectedTargetLang,

        selectedNativeLang,

        selectedGoalId,

        stats,

        entitlement,
        isPremium: Boolean(entitlement?.isPremium),
        refreshEntitlement,

        setTargetLanguage:
          setSelectedTargetLang,

        setNativeLanguage:
          setSelectedNativeLang,

        setDailyGoalId:
          setSelectedGoalId,

        /*
         * New public method.
         */

        refreshStats,

        refillLives,

        buyLivesWithGems,

        buyLivesWithCoins,

        sendOtp,

        verifyOtp,

        resetPassword,

        logout,

        completeOnboarding,

      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/* ============================================================
   HOOK
============================================================ */

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
      "useApp must be used within an AppProvider"
    );
  }

  return context;
}

