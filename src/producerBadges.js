/**
 * Producer Badges System
 * Earned by producers based on their activity and success
 */

export const PRODUCER_BADGES = {
  verified: {
    id: 'verified',
    label: 'Verified',
    emoji: '✅',
    color: '#00f5ff',
    description: 'Verified producer account',
    icon: '✅'
  },
  rising_star: {
    id: 'rising_star',
    label: 'Rising Star',
    emoji: '⭐',
    color: '#ffd700',
    description: '20+ sales in last 30 days',
    check: (stats) => (stats.salesLast30 || 0) >= 20
  },
  consistent_seller: {
    id: 'consistent_seller',
    label: 'Consistent Seller',
    emoji: '📈',
    color: '#00ff88',
    description: '50+ total sales',
    check: (stats) => (stats.totalSales || 0) >= 50
  },
  fan_favorite: {
    id: 'fan_favorite',
    label: 'Fan Favorite',
    emoji: '❤️',
    color: '#ff3366',
    description: '100+ total beat likes (cops)',
    check: (stats) => (stats.totalCops || 0) >= 100
  }
};

/**
 * Get badges earned by a producer based on stats
 * @param {Object} stats - Producer stats { totalSales, salesLast30, totalCops, isVerified }
 * @returns {Array} Array of earned badge objects
 */
export function getEarnedBadges(stats) {
  const earned = [];
  
  // Verified is manual/admin only
  if (stats?.isVerified) {
    earned.push(PRODUCER_BADGES.verified);
  }
  
  // Check automatic badges
  Object.entries(PRODUCER_BADGES).forEach(([key, badge]) => {
    if (key !== 'verified' && badge.check && badge.check(stats)) {
      earned.push(badge);
    }
  });
  
  return earned;
}
