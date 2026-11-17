// Sound, synthesized live with WebAudio — no audio files. A tiny engine hum whose pitch
// follows the car's speed, police sirens, gunshots, punches, pickups, cash, UI clicks and
// a lazy marimba-and-bass loop for the title screen. Everything is guarded: with no user
// gesture yet (or no WebAudio at all) the synth stays silent and never throws.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let musicTimer = 0;
  let musicStep = 0;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass'; engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch { return false; }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, freq) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const size = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = freq;
    const gain = ctx.createGain(); gain.gain.value = vol;
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(t);
  }

  const NOTES = [196, 220, 262, 294, 330, 392, 330, 262]; // a sunny G-major loop
  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    isMuted() { return muted; },
    click() { blip(660, 0.07, 'square', 0.12); },
    cash() { blip(880, 0.09, 'sine', 0.2); setTimeout(() => blip(1320, 0.14, 'sine', 0.2), 60); },
    pickup() { blip(520, 0.1, 'sine', 0.18, 780); },
    punch() { noise(0.08, 0.25, 300); },
    shot() { noise(0.12, 0.4, 1400); blip(160, 0.1, 'square', 0.2, 60); },
    hit() { blip(140, 0.12, 'sawtooth', 0.2, 70); },
    crash(strength) { noise(0.25, Math.min(0.5, 0.15 + strength * 0.05), 240); },
    door() { blip(220, 0.08, 'square', 0.15, 180); },
    busted() { blip(392, 0.2, 'triangle', 0.25); setTimeout(() => blip(311, 0.2, 'triangle', 0.25), 180); setTimeout(() => blip(262, 0.4, 'triangle', 0.25), 360); },
    missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'sine', 0.2), i * 90)); },
    update(dt, drivingSpeed, wanted, onTitle) {
      if (!ctx) return;
      const speedRatio = Math.min(1, Math.abs(drivingSpeed) / 335);
      engineGain.gain.value += ((drivingSpeed !== null ? 0.05 + speedRatio * 0.08 : 0) - engineGain.gain.value) * 0.2;
      if (engineOsc) engineOsc.frequency.value = 55 + speedRatio * 165;
      const sirenTarget = wanted > 0 ? 0.035 : 0;
      sirenGain.gain.value += (sirenTarget - sirenGain.gain.value) * 0.1;
      if (sirenOsc && wanted > 0) sirenOsc.frequency.value = 700 + Math.sin(ctx.currentTime * 6.2) * 180;
      if (onTitle) {
        musicTimer -= dt;
        if (musicTimer <= 0) {
          musicTimer = 0.42;
          const note = NOTES[musicStep % NOTES.length];
          blip(note, 0.3, 'triangle', 0.1);
          if (musicStep % 2 === 0) blip(note / 2, 0.4, 'sine', 0.12);
          musicStep += 1;
        }
      }
    },
  };
}
