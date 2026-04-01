import React, { useState } from "react";

export default function OnboardingModal({ onComplete, onSkip }) {
  const [step, setStep] = useState(1);

  const steps = [
    {
      title: "Welcome to 808market 🎵",
      content: "Discover fresh beats, connect with producers, and build your sound. It's the marketplace for independent hip-hop and electronic music.",
      highlight: null,
      image: "🎧",
    },
    {
      title: "Swipe to Discover 👉",
      content: "Swipe RIGHT (❤️) to like a beat. Swipe LEFT (💨) to pass. Your votes help us recommend better tracks and help producers gauge what's hot.",
      highlight: "discover",
      image: "👈➡️👉",
    },
    {
      title: "Explore & Filter 🔍",
      content: "Browse all genres, filter by BPM, search by artist. Use the Genre buttons to narrow down your hunt. Hit 'Start Over' to shuffle the deck.",
      highlight: "discover",
      image: "🎛️",
    },
    {
      title: "Top Beats Leaderboard 🔥",
      content: "Check what's winning in the 🔥 Top Beats tab. See which beats and producers are killing it. This is your competition and inspiration.",
      highlight: "leaderboard",
      image: "🏆",
    },
    {
      title: "List Your Beats 🎤",
      content: "Click the '+ LIST BEAT' button to upload and sell your tracks. Set the price, choose your license (exclusive, lease, or free), add tags and BPM. Make your beat discoverable in seconds.",
      highlight: "listbeat",
      image: "📢",
    },
    {
      title: "Customize Your Storefront 🏪",
      content: "Create your own producer storefront! Sell individual beats, features, open verses, and drumkits. Customize your branding, layout, and pricing. Build your complete music business.",
      highlight: "create",
      image: "🛍️",
    },
    {
      title: "Connect Stripe to Get Paid 💳",
      content: "Go to Settings (⚙️) → Tools → Connect Stripe. You'll get paid automatically every 7 days for beats you sell. Stripe handles the payment security.",
      highlight: null,
      image: "💰",
    },
    {
      title: "Track Your Analytics 📊",
      content: "In Settings (⚙️) → Analytics, see your beat stats, play counts, and revenue. Watch your streams and sales in real-time. This is your business dashboard.",
      highlight: null,
      image: "📈",
    },
  ];

  const currentStep = steps[step - 1];

  const triggerHaptic = (duration = 20) => {
    try {
      // iOS Safari doesn't support Vibration API - works on Android only
      if (navigator.vibrate) {
        navigator.vibrate(duration);
      }
    } catch (e) {
      // Haptics not supported
    }
  };

  const handleNext = () => {
    triggerHaptic(30); // Medium vibration
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    triggerHaptic(15); // Light vibration
    onSkip();
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {/* Close button */}
        <button className="onboarding-close" onClick={handleSkip}>
          ✕
        </button>

        {/* Step indicator */}
        <div className="onboarding-progress">
          <div className="onboarding-progress-bar">
            <div
              className="onboarding-progress-fill"
              style={{ width: `${(step / steps.length) * 100}%` }}
            />
          </div>
          <div className="onboarding-progress-text">
            Step {step} of 8
          </div>
        </div>

        {/* Content */}
        <div className="onboarding-content">
          <div className="onboarding-image">{currentStep.image}</div>
          <h2 className="onboarding-title">{currentStep.title}</h2>
          <p className="onboarding-description">{currentStep.content}</p>
        </div>

        {/* Buttons */}
        <div className="onboarding-actions">
          <button className="onboarding-skip" onClick={handleSkip}>
            Skip
          </button>
          <button className="onboarding-next" onClick={handleNext}>
            {step === steps.length ? "Let's Go! 🚀" : "Next →"}
          </button>
        </div>

        {/* Highlight box (optional, for UI elements) */}
        {currentStep.highlight && (
          <div className={`onboarding-highlight onboarding-highlight-${currentStep.highlight}`} />
        )}
      </div>
    </div>
  );
}
