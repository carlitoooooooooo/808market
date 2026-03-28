import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext.jsx";

const SUPABASE_URL = 'https://bkapxykeryzxbqpgjgab.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA';

function StatCard({ label, value, sub, color = 'var(--cyan)' }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '14px',
      padding: '18px 20px',
      flex: '1 1 140px',
    }}>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-head)', color }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '4px', fontFamily: 'var(--font-body)' }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage({ onBack }) {
  const { currentUser } = useAuth();
  const [beats, setBeats] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.username) return;
    Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/tracks?uploaded_by_username=eq.${encodeURIComponent(currentUser.username)}&select=id,title,play_count,cops,passes,price,listed_at&order=play_count.desc`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
      }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/purchases?producer_username=eq.${encodeURIComponent(currentUser.username)}&select=amount_paid,purchased_at,track_title,buyer_username&order=purchased_at.desc`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
      }).then(r => r.json()),
    ]).then(([beatsData, purchasesData]) => {
      setBeats(Array.isArray(beatsData) ? beatsData : []);
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentUser?.username]);

  const totalPlays = beats.reduce((s, b) => s + (b.play_count || 0), 0);
  const totalCops = beats.reduce((s, b) => s + (b.cops || 0), 0);
  const totalPasses = beats.reduce((s, b) => s + (b.passes || 0), 0);
  const totalRevenue = purchases.reduce((s, p) => s + (p.amount_paid || 0), 0);
  const copRate = totalCops + totalPasses > 0 ? Math.round((totalCops / (totalCops + totalPasses)) * 100) : 0;
  const producerCut = totalRevenue * 0.85;

  const top5 = [...beats].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 5);
  const maxPlays = top5[0]?.play_count || 1;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>←</button>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px' }}>📊 Beat Analytics</div>
      </div>

      <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
        ) : beats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.4)' }}>Upload some beats to see analytics.</div>
        ) : (
          <>
            {/* Overview stats */}
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>Overview</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px' }}>
              <StatCard label="Total Plays" value={totalPlays.toLocaleString()} color="var(--cyan)" />
              <StatCard label="Beats" value={beats.length} color="var(--purple)" />
              <StatCard label="❤️ Cop Rate" value={`${copRate}%`} sub={`${totalCops} cops · ${totalPasses} passes`} color="var(--green)" />
              <StatCard label="💰 Revenue" value={`$${totalRevenue.toFixed(2)}`} sub={`Your cut: $${producerCut.toFixed(2)}`} color="#ffd700" />
              <StatCard label="Sales" value={purchases.length} color="#ff9900" />
            </div>

            {/* Top beats by plays */}
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>🔥 Top Beats by Plays</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {top5.map((b, i) => (
                <div key={b.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)', fontSize: '14px' }}>#{i + 1}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600 }}>{b.title}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--cyan)', fontSize: '14px' }}>{(b.play_count || 0).toLocaleString()} plays</span>
                  </div>
                  {/* Play bar */}
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${((b.play_count || 0) / maxPlays) * 100}%`, background: 'linear-gradient(90deg, var(--cyan), var(--purple))', borderRadius: '2px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}>
                    <span>❤️ {b.cops || 0} cops</span>
                    <span>💨 {b.passes || 0} passes</span>
                    <span>{b.price ? `$${b.price}` : 'FREE'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent sales */}
            {purchases.length > 0 && (
              <>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-head)', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>💳 Recent Sales</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {purchases.slice(0, 10).map((p, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{p.track_title}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                          {p.buyer_username ? `@${p.buyer_username}` : 'Anonymous'} · {new Date(p.purchased_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--green)', fontSize: '14px' }}>${(p.amount_paid || 0).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
