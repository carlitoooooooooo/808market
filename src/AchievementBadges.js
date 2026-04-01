// Achievement Badges System

export const ACHIEVEMENTS = {
  // Producer achievements
  FIRST_SALE: {
    id: 'first_sale',
    name: 'First Sale',
    emoji: '🎉',
    description: 'Sold your first beat',
    condition: (user, tracks) => {
      const totalSales = tracks?.reduce((sum, t) => sum + (t.sales_count || 0), 0) || 0;
      return totalSales >= 1;
    },
    category: 'producer',
  },
  TEN_LIKES: {
    id: 'ten_likes',
    name: '10 Likes',
    emoji: '🔟',
    description: 'Got 10 likes on a single beat',
    condition: (user, tracks) => {
      return tracks?.some(t => (t.cops || 0) >= 10) || false;
    },
    category: 'producer',
  },
  FIFTY_LIKES: {
    id: 'fifty_likes',
    name: 'Hot Beat',
    emoji: '🔥',
    description: 'Got 50 likes on a single beat',
    condition: (user, tracks) => {
      return tracks?.some(t => (t.cops || 0) >= 50) || false;
    },
    category: 'producer',
  },
  HUNDRED_LIKES: {
    id: 'hundred_likes',
    name: 'On Fire',
    emoji: '🌡️',
    description: 'Got 100 likes on a single beat',
    condition: (user, tracks) => {
      return tracks?.some(t => (t.cops || 0) >= 100) || false;
    },
    category: 'producer',
  },
  THOUSAND_LIKES: {
    id: 'thousand_likes',
    name: 'Legend',
    emoji: '👑',
    description: 'Reached 1000 total likes',
    condition: (user, tracks) => {
      const totalCops = tracks?.reduce((sum, t) => sum + (t.cops || 0), 0) || 0;
      return totalCops >= 1000;
    },
    category: 'producer',
  },
  FIVE_BEATS: {
    id: 'five_beats',
    name: 'Prolific',
    emoji: '📚',
    description: 'Uploaded 5 beats',
    condition: (user, tracks) => {
      return (tracks?.length || 0) >= 5;
    },
    category: 'producer',
  },
  TEN_BEATS: {
    id: 'ten_beats',
    name: 'Beat Factory',
    emoji: '🏭',
    description: 'Uploaded 10 beats',
    condition: (user, tracks) => {
      return (tracks?.length || 0) >= 10;
    },
    category: 'producer',
  },
  VERIFIED: {
    id: 'verified',
    name: 'Verified',
    emoji: '✅',
    description: 'Verified producer',
    condition: (user) => {
      return user?.is_verified || false;
    },
    category: 'producer',
  },

  // Buyer achievements
  FIRST_LIKE: {
    id: 'first_like',
    name: 'First Like',
    emoji: '👍',
    description: 'Liked your first beat',
    condition: (user, votes) => {
      const likes = Object.values(votes || {}).filter(v => v === 'right').length;
      return likes >= 1;
    },
    category: 'buyer',
  },
  TEN_LIKES: {
    id: 'ten_likes',
    name: 'Music Lover',
    emoji: '🎵',
    description: 'Liked 10 beats',
    condition: (user, votes) => {
      const likes = Object.values(votes || {}).filter(v => v === 'right').length;
      return likes >= 10;
    },
    category: 'buyer',
  },
  FIFTY_LIKES: {
    id: 'fifty_likes',
    name: 'Curator',
    emoji: '🎨',
    description: 'Liked 50 beats',
    condition: (user, votes) => {
      const likes = Object.values(votes || {}).filter(v => v === 'right').length;
      return likes >= 50;
    },
    category: 'buyer',
  },
  HUNDRED_LIKES: {
    id: 'hundred_likes',
    name: 'Taste Maker',
    emoji: '⭐',
    description: 'Liked 100 beats',
    condition: (user, votes) => {
      const likes = Object.values(votes || {}).filter(v => v === 'right').length;
      return likes >= 100;
    },
    category: 'buyer',
  },
  FIVE_PURCHASES: {
    id: 'five_purchases',
    name: 'Supporter',
    emoji: '💳',
    description: 'Purchased 5 beats',
    condition: (user, purchases) => {
      return (purchases?.length || 0) >= 5;
    },
    category: 'buyer',
  },
  TEN_PURCHASES: {
    id: 'ten_purchases',
    name: 'Collector',
    emoji: '🎁',
    description: 'Purchased 10 beats',
    condition: (user, purchases) => {
      return (purchases?.length || 0) >= 10;
    },
    category: 'buyer',
  },
};

export function getUnlockedAchievements(user, tracks, votes, purchases) {
  if (!user) return [];

  const unlocked = [];
  
  Object.values(ACHIEVEMENTS).forEach(achievement => {
    let conditionMet = false;
    
    try {
      if (achievement.category === 'producer') {
        conditionMet = achievement.condition(user, tracks);
      } else if (achievement.category === 'buyer') {
        conditionMet = achievement.condition(user, votes, purchases);
      }
    } catch (e) {
      console.error('Achievement check error:', e);
    }
    
    if (conditionMet) {
      unlocked.push(achievement);
    }
  });
  
  return unlocked;
}

export function checkNewAchievements(previousUnlocked, currentUnlocked) {
  const previousIds = new Set(previousUnlocked.map(a => a.id));
  return currentUnlocked.filter(a => !previousIds.has(a.id));
}
