import { useState } from "react";

const CHANGELOG = [
  {
    version: "1.5.0", date: "Mar 24, 2026", items: [
      "Card flip to view beat details + COP IT",
      "Browse grid mode in Discover",
      "DM messaging between producers",
      "Beat tags + search by tag",
      "Liked beats list on profile",
      "Clickable notifications",
      "Settings page (change password)",
      "Name glow on Browse cards",
      "Snippet picker in Edit Beat",
      "Badges persist on reload",
    ]
  },
  {
    version: "1.4.0", date: "Mar 24, 2026", items: [
      "Desktop layout: top nav, two-column leaderboard & profile",
      "Desktop edit profile compact popup",
    ]
  },
  {
    version: "1.3.0", date: "Mar 24, 2026", items: [
      "Name glow (unlocked by uploads: 5/10/20)",
      "Avatar borders, tagline, location, social links",
      "Taste Match from real DB",
      "Follow/unfollow producers",
      "Notifications system",
    ]
  },
  {
    version: "1.2.0", date: "Mar 24, 2026", items: [
      "Stripe checkout, free downloads",
      "Beat analytics, edit/delete beats",
      "Pin a beat on profile",
      "Admin + Beta Tester badges",
      "Profile picture upload + crop",
      "Guest browse mode",
    ]
  },
  {
    version: "1.1.0", date: "Mar 23, 2026", items: [
      "Real Supabase backend",
      "MP3 upload with progress bar",
      "SoundCloud embeds",
      "Snippet picker, leaderboard, producer profiles",
    ]
  },
  {
    version: "1.0.0", date: "Mar 22, 2026", items: [
      "808market launched",
      "Tinder-style swipe UI for beats",
      "Like / Pass mechanic",
    ]
  },
];

function ChangelogModal({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '480px', maxHeight: '88vh', overflowY: 'auto', scrollbarWidth: 'none', padding: '28px 24px 48px', animation: 'slideUp 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '20px' }}>📋 Changelog</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>
        {CHANGELOG.map(entry => (
          <div key={entry.version} style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ background: 'linear-gradient(135deg, #00f5ff, #bf5fff)', color: '#000', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>v{entry.version}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>{entry.date}</span>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {entry.items.map((item, i) => (
                <li key={i} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AboutPage({ onClose }) {
  const [showChangelog, setShowChangelog] = useState(false);
  return (<>
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
      zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: 'overlayIn 0.2s ease'
    }}>
      <div style={{
        background: '#080808',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: '480px',
        maxHeight: '88vh', overflowY: 'auto',
        padding: '32px 24px 48px',
        animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '20px',
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
          fontSize: '22px', cursor: 'pointer', lineHeight: 1,
        }}>✕</button>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800,
            fontSize: '32px', letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #00f5ff, #bf5fff, #00f5ff)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'logoShimmer 4s linear infinite',
          }}>808market</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '2px', marginTop: '4px', textTransform: 'uppercase' }}>
            The Beat Marketplace
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.3), transparent)', marginBottom: '28px' }} />

        {/* Message */}
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '16px',
          lineHeight: '1.75',
          color: 'rgba(255,255,255,0.85)',
        }}>
          <p style={{ marginBottom: '16px' }}>
            Hey guys, my name is CJ. Most of you probably know me as the producer <span style={{ color: '#00f5ff', fontWeight: 600 }}>Mastercard</span>.
          </p>
          <p style={{ marginBottom: '16px' }}>
            All the other platforms to buy and sell beats online are clunky and generally pretty shitty, so I felt like I should take matters into my own hands.
          </p>
          <p style={{ marginBottom: '16px' }}>
            The goal of this platform is to be <span style={{ color: '#bf5fff', fontWeight: 600 }}>fun, easy to use</span>, and to allow producers like myself to make the money we deserve.
          </p>
          <p style={{ marginBottom: '16px' }}>
            Here, it's really easy to <span style={{ color: '#00ff88', fontWeight: 600 }}>discover and be discovered</span>. With a simple-to-use platform like 808market, producers can focus on what really matters —
          </p>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff', textAlign: 'center', marginTop: '24px' }}>
            cooking up beats 🎹
          </p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '36px', textAlign: 'center' }}>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(191,95,255,0.3), transparent)', marginBottom: '20px' }} />
          <button
            onClick={() => setShowChangelog(true)}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontFamily: "'Space Grotesk', sans-serif", padding: '6px 16px', cursor: 'pointer', marginBottom: '14px', letterSpacing: '0.5px' }}
          >📋 What's New</button>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '1px' }}>
            BUILT BY MASTERCARD · 2026
          </div>
        </div>
      </div>
    </div>

    {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </>
  );
}
