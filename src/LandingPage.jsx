import React, { useState, useEffect, useRef } from "react";
import Logo from "./Logo.jsx";
import AudioPlayer from "./AudioPlayer.js";

const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXB4eWtlcnl6eGJxcGdqZ2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODE3NzgsImV4cCI6MjA4OTg1Nzc3OH0.-URU57ytulm82gnYfpSrOQ_i0e7qlwk0LKfGokDXmWA";
const SUPABASE_URL = "https://bkapxykeryzxbqpgjgab.supabase.co";

export default function LandingPage({ onGetStarted, onBrowseAsGuest }) {
  const [beats, setBeats] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const playerRef = useRef(null);

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/tracks?order=listed_at.desc&limit=6`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
    }).then(r => r.json()).then(d => { if (Array.isArray(d)) setBeats(d); }).catch(() => {});
    return () => { if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; } };
  }, []);

  function handlePlay(beat) {
    if (!beat.audio_url) return;
    if (playingId === beat.id) {
      playerRef.current?.destroy(); playerRef.current = null; setPlayingId(null); return;
    }
    playerRef.current?.destroy();
    const p = new AudioPlayer(beat.audio_url, beat.snippet_start || 0);
    p.onEnded(() => setPlayingId(null));
    p.play(); playerRef.current = p; setPlayingId(beat.id);
  }

  return (
    <div style={{
      minHeight: '100vh',
      height: '100%',
      background: '#000',
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
      overflowY: 'auto',
      position: 'fixed',
      inset: 0,
      zIndex: 2
    }}>

      {/* Y2K Wild Gradient Background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        poInterEvents: 'none',
        background: `
          radial-gradient(ellipse 120vw 100vh at 10% 10%, rgba(255, 0, 127, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse 100vw 90vh at 90% 20%, rgba(0, 245, 255, 0.12) 0%, transparent 50%),
          radial-gradient(ellipse 80vw 100vh at 50% 100%, rgba(191, 95, 255, 0.1) 0%, transparent 60%)
        `
      }} />

      {/* Animated grid overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        poInterEvents: 'none',
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 100px, rgba(0, 245, 255, 0.03) 100px, rgba(0, 245, 255, 0.03) 101px),
          repeating-linear-gradient(90deg, transparent, transparent 100px, rgba(191, 95, 255, 0.02) 100px, rgba(191, 95, 255, 0.02) 101px)
        `,
        animation: 'slide 20s linear infinite'
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        poInterEvents: 'none',
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 100px, rgba(0, 245, 255, 0.03) 100px, rgba(0, 245, 255, 0.03) 101px),
          repeating-linear-gradient(90deg, transparent, transparent 100px, rgba(191, 95, 255, 0.02) 100px, rgba(191, 95, 255, 0.02) 101px)
        `
      }} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(0, 245, 255, 0.5)); }
          50% { filter: drop-shadow(0 0 20px rgba(191, 95, 255, 0.6)); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, padding: '0 16px 60px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 0',
          borderBottom: '1px solid rgba(0, 245, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Logo />
            <span style={{
              fontSize: '11px',
              background: 'linear-gradient(135deg, #ff0080, #00f5ff)',
              color: '#fff',
              borderRadius: '4px',
              padding: '4px 10px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              BETA
            </span>
          </div>
          <button onClick={onGetStarted} style={{
            background: 'linear-gradient(135deg, #ff0080, #00f5ff)',
            border: 'none',
            color: '#000',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'poInter',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '0.5px'
          }}>
            SIGN IN →
          </button>
        </div>

        {/* HERO SECTION */}
        <div style={{
          padding: '60px 0 50px',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '40px',
            alignItems: 'center'
          }}>
            {/* Left: Hero Text */}
            <div>
              <h1 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 900,
                fontSize: 'clamp(40px, 8vw, 72px)',
                lineHeight: 1.1,
                marginBottom: '24px',
                letterSpacing: '-2px',
                textTransform: 'uppercase',
                background: `
                  linear-gradient(135deg,
                    #ff0080 0%,
                    #00f5ff 25%,
                    #bf5fff 50%,
                    #ff0080 100%
                  )
                `,
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                THE ARTIST<br />
                MARKETPLACE<br />
                FROM THE FUTURE
              </h1>
              <p style={{
                fontSize: 'clamp(14px, 4vw, 18px)',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.7,
                marginBottom: '32px',
                maxWidth: '400px',
                fontStyle: 'italic'
              }}>
                💿 Discover beats. 🎵 Cop heat. 🚀 Get paid. <br />
                No middlemen. Just pure audio art.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={onGetStarted} style={{
                  background: 'linear-gradient(135deg, #ff0080, #00f5ff)',
                  border: 'none',
                  color: '#000',
                  borderRadius: '12px',
                  padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 32px)',
                  fontSize: 'clamp(14px, 3vw, 16px)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  boxShadow: '0 0 30px rgba(255, 0, 128, 0.4)',
                  transition: 'all 0.2s',
                  minHeight: '44px'
                }}
                onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                >
                  GET IN →
                </button>
                <button onClick={onBrowseAsGuest} style={{
                  background: 'transparent',
                  border: '2px solid #00f5ff',
                  color: '#00f5ff',
                  borderRadius: '12px',
                  padding: 'clamp(12px, 3vw, 14px) clamp(18px, 5vw, 28px)',
                  fontSize: 'clamp(14px, 3vw, 16px)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  boxShadow: '0 0 20px rgba(0, 245, 255, 0.2)',
                  transition: 'all 0.2s',
                  minHeight: '44px'
                }}
                onMouseEnter={e => {
                  e.target.style.background = 'rgba(0, 245, 255, 0.1)';
                  e.target.style.boxShadow = '0 0 30px rgba(0, 245, 255, 0.4)';
                }}
                onMouseLeave={e => {
                  e.target.style.background = 'transparent';
                  e.target.style.boxShadow = '0 0 20px rgba(0, 245, 255, 0.2)';
                }}
                >
                  LURK →
                </button>
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '20px',
                marginTop: '48px',
                paddingTop: '32px',
                borderTop: '1px solid rgba(0, 245, 255, 0.1)'
              }}>
                {[
                  { label: 'Beats', value: '🎵' },
                  { label: 'Artists', value: '🎤' },
                  { label: 'Sold', value: '💰' }
                ].map((stat, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Featured Beats Grid */}
            {beats.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px'
              }}>
                {beats.slice(0, 4).map((beat, idx) => (
                  <div
                    key={beat.id}
                    onClick={() => handlePlay(beat)}
                    style={{
                      background: `linear-gradient(135deg, rgba(0, 245, 255, ${0.05 + idx * 0.05}), rgba(191, 95, 255, ${0.05 + idx * 0.05}))`,
                      border: `2px solid ${playingId === beat.id ? '#00f5ff' : 'rgba(0, 245, 255, 0.2)'}`,
                      borderRadius: '12px',
                      padding: '16px',
                      cursor: 'poInter',
                      transition: 'all 0.2s',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#00f5ff';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 245, 255, 0.3)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = playingId === beat.id ? '#00f5ff' : 'rgba(0, 245, 255, 0.2)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {beat.cover_url && (
                      <div style={{
                        width: '100%',
                        paddingBottom: '100%',
                        background: `url(${beat.cover_url}) center/cover`,
                        borderRadius: '8px',
                        marginBottom: '12px'
                      }} />
                    )}
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{beat.title}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>@{beat.uploaded_by_username}</div>
                    <div style={{
                      fontSize: '11px',
                      color: '#00f5ff',
                      marginTop: '8px',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {playingId === beat.id ? '⏸ PAUSE' : '▶ PLAY'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          padding: '60px 0'
        }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(32px, 6vw, 48px)',
            marginBottom: '40px',
            textTransform: 'uppercase',
            letterSpacing: '-1px'
          }}>
            How It<br />
            <span style={{
              background: 'linear-gradient(135deg, #bf5fff, #ff0080)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Works
            </span>
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            {[
              { icon: '🎹', num: '01', title: 'Upload Heat', desc: 'Producers drop beats. Set price, genre, vibe. Own your shit.' },
              { icon: '👆', num: '02', title: 'Swipe Raw', desc: '15-second previews. Cop the ones that hit different. No BS.' },
              { icon: '💳', num: '03', title: 'Pay Direct', desc: 'Checkout. No middlemen. 85% straight to producer bank.' },
              { icon: '🎧', num: '04', title: 'Own Forever', desc: 'Exclusive lease or unlimited. Download & use yours forever.' },
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  background: `linear-gradient(135deg, rgba(255, 0, 128, 0.05), rgba(0, 245, 255, 0.05))`,
                  border: '1px solid rgba(0, 245, 255, 0.15)',
                  borderRadius: '16px',
                  padding: '32px 24px',
                  position: 'relative'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-15px',
                  left: '24px',
                  background: 'linear-gradient(135deg, #ff0080, #00f5ff)',
                  color: '#000',
                  width: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 700
                }}>
                  {step.num}
                </div>
                <div style={{ fontSize: '32px', marginBottom: '12px', marginTop: '20px' }}>{step.icon}</div>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: '18px',
                  marginBottom: '12px',
                  textTransform: 'uppercase'
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: 1.6
                }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA FOOTER */}
        <div style={{
          maxWidth: '1200px',
          margin: '60px auto 0',
          width: '100%',
          padding: '60px 0',
          textAlign: 'center',
          borderTop: '1px solid rgba(0, 245, 255, 0.1)'
        }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(28px, 5vw, 44px)',
            marginBottom: '24px',
            textTransform: 'uppercase'
          }}>
            Ready to<br />
            <span style={{
              background: 'linear-gradient(135deg, #00f5ff, #ff0080, #bf5fff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Move Different?
            </span>
          </h2>
          <p style={{
            fontSize: 'clamp(14px, 3vw, 16px)',
            color: 'rgba(255,255,255,0.6)',
            marginBottom: '32px'
          }}>
            Join 1000+ producers & artists building the future.
          </p>
          <button onClick={onGetStarted} style={{
            background: 'linear-gradient(135deg, #ff0080, #00f5ff)',
            border: 'none',
            color: '#000',
            borderRadius: '12px',
            padding: 'clamp(14px, 3vw, 18px) clamp(24px, 6vw, 36px)',
            fontSize: 'clamp(14px, 3vw, 16px)',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '1px',
            textTransform: 'uppercase',
            boxShadow: '0 0 30px rgba(255, 0, 128, 0.5)',
            transition: 'all 0.2s',
            minHeight: '44px'
          }}
          onMouseEnter={e => {
            e.target.style.transform = 'scale(1.08)';
            e.target.style.boxShadow = '0 0 50px rgba(255, 0, 128, 0.7)';
          }}
          onMouseLeave={e => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 0 30px rgba(255, 0, 128, 0.5)';
          }}
          >
            SIGN UP NOW ✨
          </button>
        </div>

        {/* Footer */}
        <div style={{
          paddingTop: '40px',
          marginTop: '40px',
          borderTop: '1px solid rgba(0, 245, 255, 0.1)',
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.3)'
        }}>
          808market © 2026 • Built for the culture
        </div>
      </div>
    </div>
  );
}
