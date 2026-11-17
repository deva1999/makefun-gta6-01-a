'use strict';
/* Fully synthesized WebAudio: engine, sirens, gunshots, music loop. */
window.NT = window.NT || {};
NT.createAudio = function () {
  const A = { ctx: null, engineOsc: null, engineGain: null, musicTimer: null, sirenOn: false };
  A.start = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try {
      A.ctx = new (window.AudioContext || window.webkitAudioContext)();
      A.engineOsc = A.ctx.createOscillator();
      A.engineGain = A.ctx.createGain();
      A.engineOsc.type = 'sawtooth'; A.engineOsc.frequency.value = 55;
      A.engineGain.gain.value = 0;
      A.engineOsc.connect(A.engineGain).connect(A.ctx.destination);
      A.engineOsc.start();
      A.startMusic();
    } catch (e) { A.ctx = null; }
  };
  A.beep = function (freq, dur, type, vol, slideTo) {
    if (!A.ctx) return;
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, A.ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.08, A.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, A.ctx.currentTime + dur);
    o.connect(g).connect(A.ctx.destination);
    o.start(); o.stop(A.ctx.currentTime + dur);
  };
  A.noise = function (dur, vol) {
    if (!A.ctx) return;
    const len = Math.floor(A.ctx.sampleRate * dur);
    const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = A.ctx.createBufferSource(); src.buffer = buf;
    const g = A.ctx.createGain(); g.gain.value = vol;
    src.connect(g).connect(A.ctx.destination); src.start();
  };
  A.gunshot = function (soft) { A.noise(0.14, soft ? 0.10 : 0.22); A.beep(140, 0.1, 'square', 0.06, 45); };
  A.punch = function () { A.noise(0.07, 0.14); A.beep(90, 0.08, 'sine', 0.12, 50); };
  A.pickup = function () { A.beep(660, 0.12, 'sine', 0.1); setTimeout(() => A.beep(990, 0.18, 'sine', 0.1), 90); };
  A.engineStart = function () { A.beep(70, 0.4, 'sawtooth', 0.1, 130); };
  A.sirenBurst = function () { A.beep(700, 0.16, 'square', 0.05, 950); setTimeout(() => A.beep(950, 0.16, 'square', 0.05, 700), 170); };
  A.busted = function () { A.beep(300, 0.5, 'square', 0.1, 110); };
  A.wasted = function () { A.beep(220, 0.9, 'triangle', 0.12, 55); };
  A.setEngine = function (speedRatio, driving) {
    if (!A.ctx || !A.engineOsc) return;
    const target = driving ? 0.035 + Math.abs(speedRatio) * 0.05 : 0;
    A.engineGain.gain.setTargetAtTime(target, A.ctx.currentTime, 0.1);
    A.engineOsc.frequency.setTargetAtTime(55 + Math.abs(speedRatio) * 130, A.ctx.currentTime, 0.1);
  };
  A.startMusic = function () {
    if (A.musicTimer || !A.ctx) return;
    const notes = [196, 220, 262, 220, 175, 220, 294, 262]; // lazy bay-side loop
    let i = 0;
    A.musicTimer = setInterval(() => {
      if (!A.ctx || A.ctx.state !== 'running') return;
      A.beep(notes[i % notes.length], 0.42, 'triangle', 0.035);
      if (i % 4 === 0) A.beep(notes[i % notes.length] / 2, 0.8, 'sine', 0.03);
      i++;
    }, 430);
  };
  return A;
};
