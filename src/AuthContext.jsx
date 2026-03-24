import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "./supabase.js";

const AuthContext = createContext(null);

export const AVATAR_COLORS = [
  "#ff2d78", "#ffe600", "#aaff00", "#ff6600",
  "#00cfff", "#bf5fff", "#ff4444", "#00ffaa",
];

const SESSION_KEY = "tsh_session";

// Convert username to email for Supabase Auth
function usernameToEmail(username) {
  return `${username.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}@tsh-app.com`;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore session from Supabase on mount, with 8s timeout fallback
  useEffect(() => {
    let settled = false;

    // Show cached session immediately while we verify with Supabase
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const cached = JSON.parse(saved);
        setCurrentUser(cached);
        setAuthLoading(false);
        // If cached session is missing role/isBetaTester, refresh from DB in background
        if (!cached.role || cached.isBetaTester === undefined) {
          const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
          fetch(`https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/profiles?username=eq.${encodeURIComponent(cached.username)}&select=id,username,avatar_color,bio,role,is_beta_tester`, {
            headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
          }).then(r => r.json()).then(data => {
            const p = Array.isArray(data) ? data[0] : data;
            if (p) {
              const updated = { ...cached, role: p.role || 'user', isBetaTester: p.is_beta_tester || false };
              localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
              setCurrentUser(updated);
            }
          }).catch(() => {});
        }
      }
    } catch {}

    const fallbackTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setAuthLoading(false);
      }
    }, 3000); // reduced from 8s to 3s

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (settled) return;
      settled = true;
      clearTimeout(fallbackTimer);

      if (session?.user) {
        await loadAndSetProfile(session.user.id);
      } else {
        // No active session - clear any stale localStorage
        localStorage.removeItem(SESSION_KEY);
      }
      setAuthLoading(false);
    }).catch(() => {
      if (!settled) {
        settled = true;
        clearTimeout(fallbackTimer);
        try {
          const saved = localStorage.getItem(SESSION_KEY);
          if (saved) setCurrentUser(JSON.parse(saved));
        } catch {}
        setAuthLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
      } else if (event === "SIGNED_IN" && session?.user) {
        await loadAndSetProfile(session.user.id);
      }
    });

    return () => {
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  async function loadAndSetProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;

    const user = {
      id: data.id,
      username: data.username,
      avatarColor: data.avatar_color,
      bio: data.bio || "",
      role: data.role || "user",
      isBetaTester: data.is_beta_tester || false,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setCurrentUser(user);
    return user;
  }

  const signup = useCallback(async (username, password, avatarColor, bio) => {
    if (!username || !password) return { error: "Username and password required" };
    if (password.length < 6) return { error: "Password must be at least 6 characters" };
    if (!/^[a-zA-Z0-9._-]{2,30}$/.test(username)) {
      return { error: "Username can only contain letters, numbers, dots, dashes, underscores (2-30 chars)" };
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Check if username taken (case-insensitive)
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", normalizedUsername)
      .maybeSingle();

    if (existing) return { error: "Username already taken" };

    const email = usernameToEmail(normalizedUsername);

    // Create auth user
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      if (error.message.toLowerCase().includes("rate")) {
        return { error: "Too many signups, wait a minute and try again" };
      }
      return { error: error.message };
    }

    if (!data?.user) {
      return { error: "Signup failed — please try again" };
    }

    // Check if email confirmation is required
    if (data.user.identities && data.user.identities.length === 0) {
      return { error: "Check your email to confirm your account, then log in" };
    }

    // Insert profile row
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: data.user.id,
        username: normalizedUsername,
        bio: bio || "",
        avatar_color: avatarColor || AVATAR_COLORS[0],
      })
      .select()
      .single();

    if (profileError) {
      // If profile insert fails, clean up the auth user won't happen (no admin key),
      // but at least report the error
      return { error: profileError.message };
    }

    const user = {
      id: profile.id,
      username: profile.username,
      avatarColor: profile.avatar_color,
      bio: profile.bio || "",
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setCurrentUser(user);
    return { success: true };
  }, []);

  const login = useCallback(async (username, password) => {
    if (!username || !password) return { error: "Username and password required" };

    const email = usernameToEmail(username.trim().toLowerCase());

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: "Wrong username or password" };
    }

    if (!data?.user) {
      return { error: "Login failed — please try again" };
    }

    const user = await loadAndSetProfile(data.user.id);
    if (!user) {
      return { error: "Account found but profile missing — contact support" };
    }

    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    await supabase.auth.signOut();
  }, []);

  const getUserData = useCallback((key) => {
    if (!currentUser) return null;
    try {
      const val = localStorage.getItem(`tsh_${currentUser.username}_${key}`);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  }, [currentUser]);

  const setUserData = useCallback((key, value) => {
    if (!currentUser) return;
    localStorage.setItem(`tsh_${currentUser.username}_${key}`, JSON.stringify(value));
    if (key === "avatarColor" || key === "bio") {
      const col = key === "avatarColor" ? "avatar_color" : "bio";
      const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
      fetch(`https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/profiles?username=eq.${encodeURIComponent(currentUser.username)}`, {
        method: 'PATCH',
        headers: { 'apikey': ANON, 'Authorization': `Bearer ${ANON}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [col]: value }),
      }).catch(e => console.error('Profile update error:', e));
      // Also update localStorage session
      const saved = localStorage.getItem('tsh_session');
      if (saved) {
        try {
          const session = JSON.parse(saved);
          session[key] = value;
          localStorage.setItem('tsh_session', JSON.stringify(session));
        } catch {}
      }
      setCurrentUser(prev => prev ? { ...prev, [key]: value } : prev);
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, authLoading, signup, login, logout, getUserData, setUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
