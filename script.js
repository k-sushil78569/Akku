// --- STATE & AUDIO CONFIG ---
let activeStage = 'stage-gift';
let audioCtx = null;
let synthInterval = null;
let isPlaying = false;
let currentNoteIndex = 0;
let scale = 1.0;
let noClickCount = 0;

// Emojis for falling/floating animations
const PARTICLE_EMOJIS = ['❤️', '💖', '✨', '🌸', '🎈', '🍰', '🎁', '⭐'];

// Note frequencies map (C4 and D4 added for correct lower pitch)
const NOTE_FREQS = {
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00,
  'A4': 440.00, 'B4': 493.88, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25,
  'F5': 698.46, 'G5': 783.99
};

// 'Ek Hazaaron Mein Meri Behna Hai' melody: [note, duration in beats]
const MELODY = [
  // Phoolon ka taaron ka sabka kehna hai
  ['G4', 0.5], ['G4', 0.5], ['G4', 0.5], ['F4', 0.5], ['E4', 0.5], ['D4', 0.5],
  ['C4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['C4', 1.5],
  // Ek hazaaron mein meri behna hai
  ['G4', 0.5], ['G4', 0.5], ['G4', 0.5], ['G4', 0.5], ['F4', 1.0], 
  ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['E4', 0.5], ['D4', 1.5],
  // Sari umar humein sang rehna hai
  ['G4', 0.5], ['G4', 0.5], ['A4', 0.5], ['A4', 0.5], ['B4', 0.5], ['B4', 0.5],
  ['C5', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 2.0]
];

// --- AMBIENT PARTICLES ---
const particlesContainer = document.getElementById('particles-container');

function createParticle(emojiSymbol = null) {
  const particle = document.createElement('span');
  particle.classList.add('particle');
  particle.innerText = emojiSymbol || PARTICLE_EMOJIS[Math.floor(Math.random() * PARTICLE_EMOJIS.length)];
  
  // Random sizing, positioning and duration
  const size = Math.random() * 20 + 15;
  particle.style.fontSize = `${size}px`;
  particle.style.left = `${Math.random() * 100}vw`;
  
  const duration = Math.random() * 5 + 5; // 5s to 10s
  particle.style.animationDuration = `${duration}s`;
  
  // Horizontal drift offset
  particle.style.setProperty('--drift', `${Math.random() * 40 - 20}vw`);
  
  particlesContainer.appendChild(particle);
  
  // Remove after animation completes
  setTimeout(() => {
    particle.remove();
  }, duration * 1000);
}

// Start continuous ambient floating elements
setInterval(() => {
  if (document.hidden) return;
  // Reduce generation in background stages, boost when YES is clicked
  const maxParticles = activeStage === 'stage-feedback' && document.getElementById('sweet-letter-view').classList.contains('hidden') === false ? 5 : 1;
  for(let i = 0; i < maxParticles; i++) {
    createParticle();
  }
}, 800);

// --- MUSIC SYNTHESIZER (Web Audio API) ---
function initAudio() {
  if (audioCtx) return;
  
  // Create audio context
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playNote(freq, startTime, duration) {
  if (!audioCtx) return;
  
  // Create Nodes
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const delay = audioCtx.createDelay();
  const delayGain = audioCtx.createGain();
  
  // Vibe Settings: Music Box / Chiptune
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  
  // Envelope settings: Pluck sound (instant attack, exponential decay)
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02); // Quick fade in
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration - 0.05); // Decay
  
  // Delay/Echo Effect configuration for magical ambient sound
  delay.delayTime.setValueAtTime(0.25, startTime);
  delayGain.gain.setValueAtTime(0.05, startTime); // Echo volume
  
  // Connections
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  // Hook up echo filter
  gainNode.connect(delay);
  delay.connect(delayGain);
  delayGain.connect(audioCtx.destination);
  
  // Playback control
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playNextNote() {
  if (!isPlaying) return;
  
  const tempo = 110; // Beats Per Minute
  const beatDuration = 60 / tempo;
  
  const [noteName, beats] = MELODY[currentNoteIndex];
  const freq = NOTE_FREQS[noteName];
  const duration = beats * beatDuration;
  
  initAudio();
  
  // Schedule the note to play immediately
  playNote(freq, audioCtx.currentTime, duration);
  
  // Setup timer for next note
  const nextNoteTime = duration * 1000;
  currentNoteIndex = (currentNoteIndex + 1) % MELODY.length;
  
  synthInterval = setTimeout(playNextNote, nextNoteTime);
}

function toggleMusic() {
  const musicBtn = document.getElementById('music-toggle');
  const icon = musicBtn.querySelector('.music-icon');
  const text = musicBtn.querySelector('.music-text');
  
  initAudio();
  
  if (isPlaying) {
    isPlaying = false;
    clearTimeout(synthInterval);
    icon.innerText = '🔇';
    text.innerText = 'Music Off';
    musicBtn.classList.remove('pulse-glow');
  } else {
    // Resume audio context if suspended (browser security)
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    isPlaying = true;
    currentNoteIndex = 0;
    icon.innerText = '🎵';
    text.innerText = 'Playing Song';
    musicBtn.classList.add('pulse-glow');
    playNextNote();
  }
}

document.getElementById('music-toggle').addEventListener('click', toggleMusic);


// --- STAGE NAVIGATION ---
function transitionToStage(stageId) {
  const currentStageEl = document.getElementById(activeStage);
  const nextStageEl = document.getElementById(stageId);
  
  if (!nextStageEl) return;
  
  // Fade out current
  currentStageEl.style.opacity = '0';
  currentStageEl.style.transform = 'translateY(-20px) scale(0.95)';
  
  setTimeout(() => {
    currentStageEl.classList.remove('active');
    
    // Set next active
    nextStageEl.classList.add('active');
    activeStage = stageId;
    
    // Trigger paint before transitioning opacity
    requestAnimationFrame(() => {
      nextStageEl.style.opacity = '1';
      nextStageEl.style.transform = 'translateY(0) scale(1)';
    });
  }, 400);
}


// --- STAGE 1: GIFT BOX ---
const giftBox = document.getElementById('gift-box');

giftBox.addEventListener('click', () => {
  giftBox.classList.add('opened');
  
  // Trigger bursts of sparkles/confetti
  for (let i = 0; i < 30; i++) {
    setTimeout(() => createParticle(), i * 40);
  }
  
  // Start music automatically on user click
  if (!isPlaying) {
    toggleMusic();
  }
  
  // Move to quiz stage
  setTimeout(() => {
    transitionToStage('stage-quiz');
  }, 1200);
});


// --- STAGE 2: VERIFICATION QUIZ ---
const quizQuestionContainer = document.querySelector('.quiz-question-container');
const quizFeedback = document.getElementById('quiz-feedback');
const quizProgress = document.getElementById('quiz-progress');
let quizStep = 1;

document.querySelectorAll('.quiz-opt-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Lock choices during transition
    const parentQuestion = e.target.closest('.quiz-question');
    const options = parentQuestion.querySelectorAll('.quiz-opt-btn');
    options.forEach(opt => opt.disabled = true);
    
    const correctAttr = e.target.getAttribute('data-correct');
    let feedbackText = "Correct answer! 💖";
    
    if (quizStep === 1) {
      if (correctAttr === 'yes') {
        feedbackText = "Correct! Standard Akku protocols verify you are awesome. 👑";
      } else {
        feedbackText = "Modesty bypass active. We both know Akku is the coolest! 😂";
      }
    } else if (quizStep === 2) {
      feedbackText = "Perfect energy choice! Let's get that scheduled! 🎉";
    } else {
      feedbackText = "Superpower loaded. Preparing surprise for Akshara... 🎁";
    }
    
    // Show Feedback
    quizFeedback.querySelector('.feedback-text').innerText = feedbackText;
    quizFeedback.classList.remove('hidden');
    
    // Update progress bar
    quizStep++;
    quizProgress.style.width = `${((quizStep - 1) / 3) * 100}%`;
    
    // Proceed to next step or next stage
    setTimeout(() => {
      quizFeedback.classList.add('hidden');
      parentQuestion.classList.remove('active');
      
      const nextQuestion = quizQuestionContainer.querySelector(`.quiz-question[data-step="${quizStep}"]`);
      if (nextQuestion) {
        nextQuestion.classList.add('active');
      } else {
        // End of Quiz, move to polaroids
        transitionToStage('stage-polaroids');
      }
    }, 1800);
  });
});


// --- STAGE 3: MEMORY POLAROID DECK ---
const polaroidCards = document.querySelectorAll('.polaroid-card');
const nextCardBtn = document.getElementById('next-card-btn');
let currentCardIndex = 0;

nextCardBtn.addEventListener('click', () => {
  const currentCard = polaroidCards[currentCardIndex];
  
  // Swipe current card to the left
  currentCard.classList.add('swiped-left');
  currentCard.classList.remove('active');
  
  currentCardIndex++;
  
  if (currentCardIndex < polaroidCards.length) {
    const nextCard = polaroidCards[currentCardIndex];
    nextCard.classList.add('active');
    
    // If it's the last card, change button prompt
    if (currentCardIndex === polaroidCards.length - 1) {
      nextCardBtn.innerText = "Final Step! 💖";
      nextCardBtn.classList.remove('btn-primary');
      nextCardBtn.classList.add('btn-success');
    }
  } else {
    // Transitions to Love Test stage
    transitionToStage('stage-feedback');
  }
});


// --- STAGE 4: THE LOVE TEST (RUNAWAY BUTTON) ---
const yesBtn = document.getElementById('yes-btn');
const noBtn = document.getElementById('no-btn');
const runawayContainer = document.getElementById('runaway-container');
const warnMsgEl = document.getElementById('runaway-warn-message');

const warningPhrases = [
  "Wait, that's not allowed! 😂",
  "Error 404: Option 'No' does not exist! 🚫",
  "Nice try, cursor dodging active! ⚡",
  "Access Denied! Try YES! 🥺",
  "It's physically impossible to click this! 🤭",
  "No is locked today! 🔒",
  "Button getting too tiny? Click Yes! 🤏",
  "Is that your final answer? Think again!"
];

function triggerRunaway(e) {
  if (noClickCount >= 20) {
    // Transform button to Oops!
    noBtn.classList.remove('runaway');
    noBtn.style.left = 'unset';
    noBtn.style.top = 'unset';
    noBtn.style.position = '';
    scale = 1.2;
    noBtn.style.transform = `scale(${scale})`;
    noBtn.innerText = "Oops! 🤭";
    noBtn.className = "btn btn-success btn-lg"; // Morph into a clickable green button!
    warnMsgEl.innerText = "Oops! You ran out of NOs. Only YES remains! 😂";
    return;
  }
  
  noClickCount++;
  
  // Calculate new scale FIRST so we can use it for boundary calculations
  scale = Math.max(0.12, 1.0 - (noClickCount * 0.045));
  
  // Get the base (unscaled) button dimensions
  // Reset scale temporarily to measure real size
  noBtn.style.transform = 'scale(1)';
  const baseWidth = noBtn.offsetWidth;
  const baseHeight = noBtn.offsetHeight;
  
  // The visual size after scaling
  const visualWidth = baseWidth * scale;
  const visualHeight = baseHeight * scale;
  
  // Safe padding from all edges
  const padding = 30;
  
  // Calculate safe bounds — keep button fully visible on screen
  const minX = padding;
  const minY = padding;
  const maxX = window.innerWidth - visualWidth - padding;
  const maxY = window.innerHeight - visualHeight - padding;
  
  // Ensure max is always >= min (tiny screens)
  const safeMaxX = Math.max(minX, maxX);
  const safeMaxY = Math.max(minY, maxY);
  
  const newX = Math.floor(Math.random() * (safeMaxX - minX)) + minX;
  const newY = Math.floor(Math.random() * (safeMaxY - minY)) + minY;
  
  // Apply position and scale
  noBtn.classList.add('runaway');
  noBtn.style.left = `${newX}px`;
  noBtn.style.top = `${newY}px`;
  noBtn.style.transform = `scale(${scale})`;
  noBtn.style.transformOrigin = 'top left'; // Anchor scale to top-left so position matches
  
  // Display a funny warning message with a counter to build anticipation
  const randomPhrase = warningPhrases[Math.floor(Math.random() * warningPhrases.length)];
  warnMsgEl.innerText = `[Attempt ${noClickCount}/20] ${randomPhrase}`;
  
  // Spawn a tiny broken heart particle at escape spot
  const burstEmoji = scale <= 0.35 ? '😂' : '💔';
  createParticle(burstEmoji);
}

// Hover/touch triggers runaway movement
noBtn.addEventListener('mouseenter', triggerRunaway);
noBtn.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent accidental click triggers
  triggerRunaway(e);
});

// Click fallback if she somehow manages to click it
noBtn.addEventListener('click', (e) => {
  e.preventDefault();
  if (noClickCount >= 20) {
    warnMsgEl.innerText = "Oops! Happy Birthday! ❤️";
    celebrateSurprise();
  } else {
    warnMsgEl.innerText = "Error: System Override. NO was clicked but converted to YES! ❤️";
    setTimeout(celebrateSurprise, 1000);
  }
});

// YES BUTTON CELEBRATION
yesBtn.addEventListener('click', celebrateSurprise);

function celebrateSurprise() {
  // Clear runaway warning
  warnMsgEl.innerText = "";
  
  // Trigger massive confetti explosion
  let confettisCount = 100;
  const confettiInterval = setInterval(() => {
    createParticle();
    confettisCount--;
    if (confettisCount <= 0) {
      clearInterval(confettiInterval);
    }
  }, 15);
  
  // Hide Final Question, show Letter Card
  document.getElementById('final-question-view').classList.add('hidden');
  document.getElementById('sweet-letter-view').classList.remove('hidden');
}

// Reset button to play again
document.getElementById('restart-btn').addEventListener('click', () => {
  // Reset stages
  activeStage = 'stage-gift';
  scale = 1.0;
  noClickCount = 0;
  quizStep = 1;
  currentCardIndex = 0;
  
  // Reset gift box
  giftBox.classList.remove('opened');
  
  // Reset quiz options and state
  quizProgress.style.width = '33.3%';
  document.querySelectorAll('.quiz-opt-btn').forEach(btn => btn.disabled = false);
  document.querySelectorAll('.quiz-question').forEach(q => q.classList.remove('active'));
  document.querySelector('.quiz-question[data-step="1"]').classList.add('active');
  
  // Reset polaroids
  polaroidCards.forEach(card => {
    card.classList.remove('swiped-left');
    card.classList.remove('active');
  });
  polaroidCards[0].classList.add('active');
  nextCardBtn.innerText = "Next Reason →";
  nextCardBtn.classList.remove('btn-success');
  nextCardBtn.classList.add('btn-primary');
  
  // Reset runaway button
  noBtn.classList.remove('runaway');
  noBtn.style.left = 'unset';
  noBtn.style.top = 'unset';
  noBtn.style.transform = 'scale(1)';
  noBtn.innerText = "No 💔";
  noBtn.className = "btn btn-danger btn-lg";
  
  // Reset views
  document.getElementById('final-question-view').classList.remove('hidden');
  document.getElementById('sweet-letter-view').classList.add('hidden');
  
  // Route back to gift stage
  transitionToStage('stage-gift');
});
