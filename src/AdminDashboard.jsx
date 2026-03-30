/**
 * AdminDashboard.jsx — Full-screen admin panel for 808market
 *
 * SQL to run once in Supabase:
 *   CREATE TABLE announcements (
 *     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     body text,
 *     created_by text,
 *     created_at timestamptz DEFAULT now(),
 *     is_active boolean DEFAULT true
 *   );
 *   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
 */

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";

const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA";
const BASE = "https://bkapxykeryzxbqpgjgab.supabase.co/rest/v1";
const TEAM_MEMBERS = ["avalions"];

const TABS = [
  { id: "analytics", label: "📊 Analytics" },
  { id: "users", label: "👥 Users" },
  { id: "content", label: "🎵 Content" },
  { id: "finance", label: "💰 Finance" },
  { id: "bugs", label: "🐛 Bug Reports" },
  { id: "announcements", label: "📢 Announcements" },
];

function sbFetch(path, opts = {}) {
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...(opts.headers || {}),
    },
  });
}

// ─── Analytics Tab ───────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [stats, setStats] = useState(null);
  const [topProducers, setTopProducers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, tracksRes, purchasesRes, newUsersRes, topRes] = await Promise.all([
          sbFetch("/profiles?select=id", { headers: { Prefer: "count=exact", "Range-Unit": "items", Range: "0-0" } }),
          sbFetch("/tracks?select=id,play_count,cops,uploaded_by_username", { headers: { Prefer: "count=exact", "Range-Unit": "items", Range: "0-0" } }),
          sbFetch("/purchases?select=amount_paid"),
          sbFetch(
            `/profiles?created_at=gte.${new Date(Date.now() - 7 * 86400000).toISOString()}&select=id`,
            { headers: { Prefer: "count=exact", "Range-Unit": "items", Range: "0-0" } }
          ),
          sbFetch("/tracks?select=uploaded_by_username,cops&order=cops.desc&limit=200"),
        ]);

        const totalUsers = parseInt(usersRes.headers.get("Content-Range")?.split("/")[1] || 0);
        const totalBeats = parseInt(tracksRes.headers.get("Content-Range")?.split("/")[1] || 0);
        const newSignups = parseInt(newUsersRes.headers.get("Content-Range")?.split("/")[1] || 0);

        const tracksData = await tracksRes.json();
        const totalPlays = Array.isArray(tracksData)
          ? tracksData.reduce((s, t) => s + (t.play_count || 0), 0)
          : 0;

        const purchasesData = await purchasesRes.json();
        const totalRevenue = Array.isArray(purchasesData)
          ? purchasesData.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0)
          : 0;

        // Top 5 producers by cops
        const topData = await topRes.json();
        if (Array.isArray(topData)) {
          const map = {};
          topData.forEach((t) => {
            const u = t.uploaded_by_username || "unknown";
            map[u] = (map[u] || 0) + (t.cops || 0);
          });
          const sorted = Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
          setTopProducers(sorted);
        }

        setStats({ totalUsers, totalBeats, totalPlays, totalRevenue, newSignups });
      } catch (e) {
        console.error("AdminDashboard analytics error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <AdminLoading />;

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? "—", icon: "👤" },
    { label: "Total Beats", value: stats?.totalBeats ?? "—", icon: "🎵" },
    { label: "Total Plays", value: stats?.totalPlays?.toLocaleString() ?? "—", icon: "▶️" },
    { label: "Total Revenue", value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}`, icon: "💵" },
    { label: "New Signups (7d)", value: stats?.newSignups ?? "—", icon: "🆕" },
  ];

  return (
    <div className="admin-tab-content">
      <div className="admin-stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="admin-stat-card">
            <div className="admin-stat-icon">{c.icon}</div>
            <div className="admin-stat-value">{c.value}</div>
            <div className="admin-stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <h3 className="admin-section-title">🏆 Top 5 Producers by Cops</h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Producer</th>
              <th>Cops</th>
            </tr>
          </thead>
          <tbody>
            {topProducers.map(([username, cops], i) => (
              <tr key={username}>
                <td>{i + 1}</td>
                <td>@{username}</td>
                <td>{cops}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(null); // username

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sbFetch(
        "/profiles?select=id,username,role,is_pro,is_beta_tester,is_banned,last_seen&order=last_seen.desc.nullslast&limit=500"
      );
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function patchUser(username, patch) {
    setActionPending(username);
    try {
      await sbFetch(`/profiles?username=eq.${encodeURIComponent(username)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, ...patch } : u))
      );
    } catch (e) {
      console.error("patchUser error:", e);
    } finally {
      setActionPending(null);
    }
  }

  const filtered = search
    ? users.filter((u) =>
        u.username?.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  if (loading) return <AdminLoading />;

  return (
    <div className="admin-tab-content">
      <input
        className="admin-search"
        placeholder="🔍 Search username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>PRO</th>
              <th>Beta</th>
              <th>Banned</th>
              <th>Last Seen</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const pending = actionPending === u.username;
              return (
                <tr key={u.id || u.username}>
                  <td>@{u.username}</td>
                  <td>
                    <span className={`admin-badge admin-badge--${u.role || "user"}`}>
                      {u.role || "user"}
                    </span>
                  </td>
                  <td>{u.is_pro ? "✅" : "—"}</td>
                  <td>{u.is_beta_tester ? "✅" : "—"}</td>
                  <td>{u.is_banned ? "🚫" : "—"}</td>
                  <td style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                    {u.last_seen ? new Date(u.last_seen).toLocaleDateString() : "—"}
                  </td>
                  <td>
                    <div className="admin-action-row">
                      {!u.is_pro ? (
                        <button
                          className="admin-btn admin-btn--pro"
                          disabled={pending}
                          onClick={() => patchUser(u.username, { is_pro: true })}
                        >
                          Grant PRO
                        </button>
                      ) : (
                        <button
                          className="admin-btn admin-btn--revoke"
                          disabled={pending}
                          onClick={() => patchUser(u.username, { is_pro: false })}
                        >
                          Revoke PRO
                        </button>
                      )}
                      {!u.is_beta_tester && (
                        <button
                          className="admin-btn admin-btn--beta"
                          disabled={pending}
                          onClick={() => patchUser(u.username, { is_beta_tester: true })}
                        >
                          Beta
                        </button>
                      )}
                      {!u.is_banned ? (
                        <button
                          className="admin-btn admin-btn--ban"
                          disabled={pending}
                          onClick={() => {
                            if (window.confirm(`Ban @${u.username}?`))
                              patchUser(u.username, { is_banned: true });
                          }}
                        >
                          Ban
                        </button>
                      ) : (
                        <button
                          className="admin-btn admin-btn--unban"
                          disabled={pending}
                          onClick={() => patchUser(u.username, { is_banned: false })}
                        >
                          Unban
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Content Tab ─────────────────────────────────────────────────────────────

function ContentTab() {
  const [tracks, setTracks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, mRes, lRes] = await Promise.all([
        sbFetch("/tracks?select=id,title,artist,uploaded_by_username,listed_at,cops&order=listed_at.desc&limit=20"),
        sbFetch("/community_chat?select=id,sender,body,created_at&order=created_at.desc&limit=50"),
        sbFetch("/artist_listings?select=id,username,title,is_active,created_at&order=created_at.desc&limit=20"),
      ]);
      const [tData, mData, lData] = await Promise.all([tRes.json(), mRes.json(), lRes.json()]);
      if (Array.isArray(tData)) setTracks(tData);
      if (Array.isArray(mData)) setMessages(mData);
      if (Array.isArray(lData)) setListings(lData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteTrack(id) {
    if (!window.confirm("Delete this track? This cannot be undone.")) return;
    await sbFetch(`/tracks?id=eq.${id}`, { method: "DELETE" });
    setTracks((p) => p.filter((t) => t.id !== id));
  }

  async function deleteMessage(id) {
    await sbFetch(`/community_chat?id=eq.${id}`, { method: "DELETE" });
    setMessages((p) => p.filter((m) => m.id !== id));
  }

  async function deactivateListing(id) {
    await sbFetch(`/artist_listings?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: false }),
    });
    setListings((p) =>
      p.map((l) => (l.id === id ? { ...l, is_active: false } : l))
    );
  }

  if (loading) return <AdminLoading />;

  return (
    <div className="admin-tab-content">
      <h3 className="admin-section-title">🎵 Recent Tracks</h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Artist</th>
              <th>Uploader</th>
              <th>Cops</th>
              <th>Listed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{t.artist}</td>
                <td>@{t.uploaded_by_username}</td>
                <td>{t.cops || 0}</td>
                <td style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                  {t.listed_at ? new Date(t.listed_at).toLocaleDateString() : "—"}
                </td>
                <td>
                  <button
                    className="admin-btn admin-btn--delete"
                    onClick={() => deleteTrack(t.id)}
                  >
                    🗑 Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="admin-section-title" style={{ marginTop: "24px" }}>
        💬 Community Chat (last 50)
      </h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sender</th>
              <th>Message</th>
              <th>Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id}>
                <td>@{m.sender}</td>
                <td style={{ maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.body}
                </td>
                <td style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                  {m.created_at ? new Date(m.created_at).toLocaleTimeString() : "—"}
                </td>
                <td>
                  <button
                    className="admin-btn admin-btn--delete"
                    onClick={() => deleteMessage(m.id)}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="admin-section-title" style={{ marginTop: "24px" }}>
        🎨 Artist Listings
      </h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Title</th>
              <th>Active</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id}>
                <td>@{l.username}</td>
                <td>{l.title}</td>
                <td>{l.is_active ? "✅" : "❌"}</td>
                <td style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                  {l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}
                </td>
                <td>
                  {l.is_active && (
                    <button
                      className="admin-btn admin-btn--delete"
                      onClick={() => deactivateListing(l.id)}
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Finance Tab ─────────────────────────────────────────────────────────────

function FinanceTab() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await sbFetch(
          "/purchases?select=id,track_title,buyer_username,amount_paid,purchased_at,payout_transferred&order=purchased_at.desc"
        );
        const data = await res.json();
        if (Array.isArray(data)) setPurchases(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalRevenue = purchases.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
  const platformCut = totalRevenue * 0.15;

  if (loading) return <AdminLoading />;

  return (
    <div className="admin-tab-content">
      <div className="admin-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">💵</div>
          <div className="admin-stat-value">${totalRevenue.toFixed(2)}</div>
          <div className="admin-stat-label">Total Revenue</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">🏦</div>
          <div className="admin-stat-value">${platformCut.toFixed(2)}</div>
          <div className="admin-stat-label">Platform Cut (15%)</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">🧾</div>
          <div className="admin-stat-value">{purchases.length}</div>
          <div className="admin-stat-label">Total Purchases</div>
        </div>
      </div>

      <h3 className="admin-section-title">🧾 All Purchases</h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Track</th>
              <th>Buyer</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Payout Sent</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td>{p.track_title || "—"}</td>
                <td>@{p.buyer_username || "—"}</td>
                <td style={{ color: "var(--green, #00e676)", fontWeight: 700 }}>
                  ${parseFloat(p.amount_paid || 0).toFixed(2)}
                </td>
                <td style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                  {p.purchased_at ? new Date(p.purchased_at).toLocaleDateString() : "—"}
                </td>
                <td>{p.payout_transferred ? "✅" : "⏳"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Bug Reports Tab ─────────────────────────────────────────────────────────

function BugsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await sbFetch(
          `/messages?body=like.🐛 BUG REPORT%&select=id,sender,body,created_at&order=created_at.desc&limit=100`
        );
        const data = await res.json();
        if (Array.isArray(data)) setReports(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <AdminLoading />;

  if (reports.length === 0) {
    return (
      <div className="admin-tab-content admin-empty">
        <span>🐛</span>
        <p>No bug reports found</p>
      </div>
    );
  }

  return (
    <div className="admin-tab-content">
      <h3 className="admin-section-title">🐛 Bug Reports ({reports.length})</h3>
      <div className="admin-bug-list">
        {reports.map((r) => (
          <div key={r.id} className="admin-bug-card">
            <div className="admin-bug-header">
              <span className="admin-bug-sender">@{r.sender}</span>
              <span className="admin-bug-time">
                {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
              </span>
            </div>
            <div className="admin-bug-body">{r.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Announcements Tab ────────────────────────────────────────────────────────

function AnnouncementsTab({ currentUser }) {
  const [announcements, setAnnouncements] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sbFetch("/announcements?order=created_at.desc&limit=50");
      const data = await res.json();
      if (Array.isArray(data)) setAnnouncements(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await sbFetch("/announcements", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          body: body.trim(),
          created_by: currentUser?.username || "admin",
          is_active: true,
        }),
      });
      setBody("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(id) {
    await sbFetch(`/announcements?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: false }),
    });
    setAnnouncements((p) =>
      p.map((a) => (a.id === id ? { ...a, is_active: false } : a))
    );
  }

  return (
    <div className="admin-tab-content">
      <h3 className="admin-section-title">📢 New Announcement</h3>
      <form onSubmit={submit} className="admin-announce-form">
        <textarea
          className="admin-announce-textarea"
          placeholder="Write an announcement for all users..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
        />
        <button
          type="submit"
          className="admin-btn admin-btn--pro"
          disabled={submitting || !body.trim()}
          style={{ alignSelf: "flex-start" }}
        >
          {submitting ? "Posting..." : "📢 Post Announcement"}
        </button>
      </form>

      <h3 className="admin-section-title" style={{ marginTop: "24px" }}>
        📋 All Announcements
      </h3>
      {loading ? (
        <AdminLoading />
      ) : (
        <div className="admin-announce-list">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`admin-announce-card${!a.is_active ? " admin-announce-card--inactive" : ""}`}
            >
              <div className="admin-announce-meta">
                <span>by @{a.created_by}</span>
                <span>{a.created_at ? new Date(a.created_at).toLocaleString() : "—"}</span>
                <span
                  className={`admin-badge ${a.is_active ? "admin-badge--active" : "admin-badge--inactive"}`}
                >
                  {a.is_active ? "Live" : "Inactive"}
                </span>
              </div>
              <p className="admin-announce-body">{a.body}</p>
              {a.is_active && (
                <button
                  className="admin-btn admin-btn--delete"
                  onClick={() => deactivate(a.id)}
                >
                  Deactivate
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function AdminLoading() {
  return (
    <div className="admin-loading">
      <span className="admin-loading-spinner" />
      Loading…
    </div>
  );
}

// ─── Main AdminDashboard ──────────────────────────────────────────────────────

export default function AdminDashboard({ onClose }) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("analytics");

  const isAdmin =
    currentUser?.role?.toLowerCase() === "admin" ||
    TEAM_MEMBERS.includes(currentUser?.username);

  // Redirect non-admin immediately
  useEffect(() => {
    if (!isAdmin) {
      onClose?.();
    }
  }, [isAdmin, onClose]);

  if (!isAdmin) return null;

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        {/* Header */}
        <div className="admin-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>🛠️</span>
            <span className="admin-title">Admin Dashboard</span>
            <span className="admin-badge admin-badge--admin">@{currentUser?.username}</span>
          </div>
          <button className="admin-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div className="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`admin-tab-btn${activeTab === t.id ? " admin-tab-btn--active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="admin-body">
          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "content" && <ContentTab />}
          {activeTab === "finance" && <FinanceTab />}
          {activeTab === "bugs" && <BugsTab />}
          {activeTab === "announcements" && (
            <AnnouncementsTab currentUser={currentUser} />
          )}
        </div>
      </div>
    </div>
  );
}
