// Easter Eggs Module
export const initEasterEggs = () => {
  // Konami Code: ↑↑↓↓←→←→BA
  const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIndex = 0;

  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'a' ? e.key.toLowerCase() : e.code;
    
    if (key === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        triggerKonamiEasterEgg();
        konamiIndex = 0;
      }
    } else {
      konamiIndex = 0;
    }
  });

  // Console message
  console.log(
    '%c🎵 808market Easter Eggs 🎵',
    'font-size: 24px; font-weight: bold; color: #00f5ff;'
  );
  console.log(
    '%cFound secrets?\\n' +
    '→ Konami Code: ↑↑↓↓←→←→BA\\n' +
    '→ Click logo 5 times\\n' +
    '→ Search for "help"\\n' +
    '→ Vote 10, 50, 100 beats\\n' +
    '→ Type "nyan" in search',
    'color: #bf5fff; font-size: 12px;'
  );
};

function triggerKonamiEasterEgg() {
  // Create floating musical notes
  const notes = ['🎵', '🎶', '🎼', '♪', '♫'];
  
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const note = document.createElement('div');
      note.textContent = notes[Math.floor(Math.random() * notes.length)];
      note.style.cssText = `
        position: fixed;
        left: ${Math.random() * window.innerWidth}px;
        top: -50px;
        font-size: ${20 + Math.random() * 30}px;
        pointer-events: none;
        z-index: 9999;
        animation: float-up 3s ease-out forwards;
        opacity: 0.8;
      `;
      document.body.appendChild(note);
      
      setTimeout(() => note.remove(), 3000);
    }, i * 100);
  }
  
  // Add animation if not already present
  if (!document.getElementById('easter-egg-styles')) {
    const style = document.createElement('style');
    style.id = 'easter-egg-styles';
    style.textContent = `
      @keyframes float-up {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(-${window.innerHeight}px) rotate(360deg); opacity: 0; }
      }
      @keyframes spin-rainbow {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Show message
  alert('🎵 YOU FOUND THE KONAMI CODE! 🎵\n\nSecret unlocked! 🌟');
}

export const triggerLogoClickEasterEgg = () => {
  // Find the logo element
  const logo = document.querySelector('.logo-text');
  if (logo) {
    logo.textContent = 'producerhub';
    logo.style.fontSize = '20px';
    logo.style.fontWeight = '900';
    logo.style.background = 'linear-gradient(90deg, #FF9000 0%, #FF9000 50%, #000 50%)';
    logo.style.backgroundClip = 'text';
    logo.style.webkitBackgroundClip = 'text';
    logo.style.webkitTextFillColor = 'transparent';
    logo.style.letterSpacing = '1px';
    
    // Reset after 10 seconds
    setTimeout(() => {
      logo.textContent = '808market';
      logo.style.fontSize = '';
      logo.style.fontWeight = '';
      logo.style.background = '';
      logo.style.backgroundClip = '';
      logo.style.webkitBackgroundClip = '';
      logo.style.webkitTextFillColor = '';
      logo.style.letterSpacing = '';
    }, 10000);
  }
  
  document.documentElement.style.animation = 'spin-rainbow 3s linear';
  setTimeout(() => {
    document.documentElement.style.animation = '';
  }, 3000);
};

export const checkSearchEasterEgg = (query) => {
  const q = query.toLowerCase().trim();
  
  if (q === 'help') {
    return {
      isEasterEgg: true,
      message: '🎯 EASTER EGGS FOUND!\n\n' +
        '→ Konami Code: ↑↑↓↓←→←→BA (floating notes!)\n' +
        '→ Click logo 5 times (rainbow spin!)\n' +
        '→ Search "nyan" (cat beats 🐱)\n' +
        '→ Vote 10, 50, 100 beats (milestone messages!)\n' +
        '→ Vote 808 beats (ultimate achievement!)\n' +
        '→ Find producer named "secret"\n\n' +
        'Keep exploring! 🔍'
    };
  }
  
  if (q === 'nyan') {
    return {
      isEasterEgg: true,
      message: '🐱 NYAN CAT BEATS 🐱\n\nNo beats found, but the real treasure was the friends we made along the way... 😸'
    };
  }
  
  if (q === 'secret') {
    return {
      isEasterEgg: true,
      message: '🤫 SHHHHHHH!\n\nYou found the secret. The secret is: there are more secrets.'
    };
  }
  
  return { isEasterEgg: false };
};

export const checkVoteStreak = (voteCount) => {
  const milestones = {
    10: '🔥 10 BEATS VOTED! You\'re heating up!',
    50: '⚡ 50 BEATS! You\'re on FIRE! 🔥🔥🔥',
    100: '🌟 100 BEATS! LEGEND STATUS UNLOCKED! 🏆',
    808: '👑 808 BEATS! YOU ARE THE ONE! 👑\n\n(808 = The Manufacturer, The God of Beats)',
  };
  
  return milestones[voteCount] || null;
};

export const checkProducerEasterEgg = (username) => {
  const eggs = {
    'secret': '🤫 You found the secret producer!',
    'rick': '🎵 Never gonna give you up...',
    'admin': '👑 Admin privileges locked in.',
    'test': '🧪 Test beat incoming!',
  };
  
  return eggs[username?.toLowerCase()] || null;
};
