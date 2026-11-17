// Neon Bay — synthesized sound: WebAudio only, no audio files.
// Engine hum, sirens, gunshots, pickup blips, crashes and a small bass-and-hat
// music loop, all generated from oscillators and filtered noise.
export function createAudio() {
  const audio = {
    ctx: null, master: null, musicGain: null, engineOsc: null, engineOsc2: null,
    engineGain: null, sirenTimer: 0, sirenOn: false, musicOn: true,
    musicStep: 0, musicTimer: 0, started: false,
  };

  function ensure() {
    if (audio.ctx) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
      audio.musicGain = audio.ctx.createGain();
      audio.musicGain.gain.value = 0.16;
      audio.musicGain.connect(audio.master);
      // Engine: two detuned saws through a low-pass, gain driven by speed.
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 55;
      audio.engineOsc2 = audio.ctx.createOscillator();
      audio.engineOsc2.type = 'square';
      audio.engineOsc2.frequency.value = 27;
      const filt = audio.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 320;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      audio.engineOsc.connect(filt); audio.engineOsc2.connect(filt);
      filt.connect(audio.engineGain); audio.engineGain.connect(audio.master);
      audio.engineOsc.start(); audio.engineOsc2.start();
      audio.started = true;
      return true;
    } catch { return false; }
  }

  function noiseBuffer(seconds) {
    const buf = audio.ctx.createBuffer(1, audio.ctx.sampleRate * seconds, audio.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function blip(freq, dur, type = 'sine', vol = 0.25, slideTo = null) {
    if (!ensure()) return;
    const t = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(audio.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noiseHit(dur, vol, filterFreq, type = 'lowpass') {
    if (!ensure()) return;
    const t = audio.ctx.currentTime;
    const src = audio.ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const filt = audio.ctx.createBiquadFilter();
    filt.type = type; filt.frequency.value = filterFreq;
    const g = audio.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(audio.master);
    src.start(t);
  }

  const api = {
    // Call on the first user gesture; also resumes a suspended context.
    unlock() {
      if (ensure() && audio.ctx.state === 'suspended') audio.ctx.resume();
    },
    toggleMusic() {
      audio.musicOn = !audio.musicOn;
      if (audio.musicGain) audio.musicGain.gain.value = audio.musicOn ? 0.16 : 0;
      return audio.musicOn;
    },
    // speedNorm 0..1 while driving; 0 silences the engine.
    setEngine(speedNorm, on) {
      if (!audio.ctx) return;
      const t = audio.ctx.currentTime;
      const f = 48 + speedNorm * 140;
      audio.engineOsc.frequency.setTargetAtTime(f, t, 0.08);
      audio.engineOsc2.frequency.setTargetAtTime(f / 2, t, 0.08);
      audio.engineGain.gain.setTargetAtTime(on ? 0.05 + speedNorm * 0.06 : 0, t, 0.1);
    },
    gunshot() { noiseHit(0.14, 0.5, 1800, 'highpass'); blip(160, 0.1, 'square', 0.2, 60); },
    punch() { noiseHit(0.08, 0.3, 500); },
    crash(intensity = 1) { noiseHit(0.25, 0.35 * intensity, 900); blip(90, 0.18, 'triangle', 0.25, 45); },
    pickup() { blip(880, 0.09, 'sine', 0.25); setTimeout(() => blip(1318, 0.12, 'sine', 0.25), 70); },
    missionDone() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.28), i * 95));
    },
    missionFail() { [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.2, 'sawtooth', 0.18), i * 120)); },
    busted() { [440, 415, 392, 370].forEach((f, i) => setTimeout(() => blip(f, 0.25, 'square', 0.15), i * 140)); },
    click() { blip(660, 0.05, 'sine', 0.15); },
    // Two-tone police siren, called every frame while wanted > 0.
    siren(dt, wanted) {
      if (!ensure() || wanted <= 0) return;
      audio.sirenTimer -= dt;
      if (audio.sirenTimer > 0) return;
      audio.sirenTimer = 0.42;
      audio.sirenOn = !audio.sirenOn;
      blip(audio.sirenOn ? 715 : 960, 0.38, 'sine', 0.07);
    },
    // Simple 8-step loop: funky bassline + hats, scheduled per frame.
    music(dt) {
      if (!ensure() || !audio.musicOn) return;
      audio.musicTimer -= dt;
      if (audio.musicTimer > 0) return;
      audio.musicTimer = 0.21;
      const bass = [55, 0, 55, 65.4, 0, 55, 82.4, 73.4];
      const step = audio.musicStep % 8;
      const f = bass[step];
      if (f) {
        const t = audio.ctx.currentTime;
        const o = audio.ctx.createOscillator();
        const g = audio.ctx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
        o.connect(g); g.connect(audio.musicGain);
        o.start(t); o.stop(t + 0.2);
      }
      if (step % 2 === 1) noiseHit(0.03, 0.06, 8000, 'highpass');
      audio.musicStep++;
    },
  };
  return api;
}
