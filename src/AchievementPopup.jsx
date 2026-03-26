import React, { useState, useEffect } from "react";

const ACHIEVEMENTS = {
  cops_50: {
    id: "cops_50",
    title: "Cop Master",
    description: "Reached 50 cops!",
    icon: "🔥",
  },
  cops_100: {
    id: "cops_100",
    title: "Legendary Taste",
    description: "Reached 100 cops!",
    icon: "⭐",
  },
  followers_100: {
    id: "followers_100",
    title: "Rising Star",
    description: "Reached 100 followers!",
    icon: "✨",
  },
  followers_500: {
    id: "followers_500",
    title: "Influencer",
    description: "Reached 500 followers!",
    icon: "👑",
  },
  name_glow: {
    id: "name_glow",
    title: "Glow Up",
    description: "Unlocked name glow!",
    icon: "💫",
  },
};

export default function AchievementPopup({ achievement, onAnimationEnd }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!achievement) return;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onAnimationEnd?.(), 500);
    }, 3000);
    return () => clearTimeout(timer);
  }, [achievement, onAnimationEnd]);

  if (!achievement || !visible) return null;

  const data = ACHIEVEMENTS[achievement];
  if (!data) return null;

  return (
    <div className="achievement-popup-container">
      <div className="achievement-popup">
        <div className="achievement-icon">{data.icon}</div>
        <div className="achievement-content">
          <div className="achievement-title">{data.title}</div>
          <div className="achievement-description">{data.description}</div>
        </div>
      </div>
    </div>
  );
}
