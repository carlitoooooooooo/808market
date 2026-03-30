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
        // Always re-fetch role/avatar from DB in background to stay fresh
        {
          const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
          fetch(`https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/profiles?username=eq.${encodeURIComponent(cached.username)}&select=id,username,avatar_color,bio,role,is_beta_tester,avatar_url`, {
            headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
          }).then(r => r.json()).then(data => {
            const p = Array.isArray(data) ? data[0] : data;
            if (p) {
              const updated = { ...cached, role: p.role || 'user', isBetaTester: p.is_beta_tester || false, avatarUrl: p.avatar_url || cached.avatarUrl || null };
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

    // Also fetch role via direct REST (Supabase JS client can strip role due to RLS)
    const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
    let role = data.role || "user";
    let isBetaTester = data.is_beta_tester || false;
    let avatarUrl = data.avatar_url || null;
    try {
      const res = await fetch(`https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/profiles?id=eq.${userId}&select=role,is_beta_tester,avatar_url`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
      });
      const rows = await res.json();
      if (Array.isArray(rows) && rows[0]) {
        role = rows[0].role || role;
        isBetaTester = rows[0].is_beta_tester ?? isBetaTester;
        avatarUrl = rows[0].avatar_url || avatarUrl;
      }
    } catch {}

    const user = {
      id: data.id,
      username: data.username,
      avatarColor: data.avatar_color,
      avatarUrl,
      bio: data.bio || "",
      role,
      isBetaTester,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setCurrentUser(user);
    return user;
  }

  const signup = useCallback(async (username, password, avatarColor, bio, realEmail) => {
    if (!username || !password) return { error: "Username and password required" };
    if (password.length < 6) return { error: "Password must be at least 6 characters" };
    if (!/^[a-zA-Z0-9._-]{2,30}$/.test(username)) {
      return { error: "Username can only contain letters, numbers, dots, dashes, underscores (2-30 chars)" };
    }
    if (realEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(realEmail)) {
      return { error: "Please enter a valid email address" };
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Check if username taken (case-insensitive)
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", normalizedUsername)
      .maybeSingle();

    if (existing) return { error: "Username already taken" };

    // Use real email if provided, else generate a fake one
    const email = realEmail ? realEmail.trim().toLowerCase() : usernameToEmail(normalizedUsername);

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
        email: realEmail ? realEmail.trim().toLowerCase() : null,
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

    const normalizedUsername = username.trim().toLowerCase();

    // First try the generated fake email (legacy accounts)
    const fakeEmail = usernameToEmail(normalizedUsername);
    let { data, error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });

    // If that fails, check if they signed up with a real email
    if (error) {
      try {
        const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';
        const profileRes = await fetch(
          `https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1/profiles?username=eq.${encodeURIComponent(normalizedUsername)}&select=email`,
          { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
        );
        const profiles = await profileRes.json();
        const realEmail = profiles?.[0]?.email;
        if (realEmail && realEmail !== fakeEmail) {
          const result = await supabase.auth.signInWithPassword({ email: realEmail, password });
          data = result.data;
          error = result.error;
        }
      } catch {}
    }

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
