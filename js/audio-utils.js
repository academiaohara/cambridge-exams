// js/audio-utils.js
// Shared feedback sounds and phrase playback control for lesson exercises

(function() {
  'use strict';

  var audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    return audioCtx;
  }

  function resumeContext(ctx) {
    if (ctx.state === 'suspended') return ctx.resume();
    return Promise.resolve();
  }

  function playTone(ctx, frequency, startTime, duration, options) {
    options = options || {};
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    var volume = options.volume != null ? options.volume : 0.25;
    var type = options.type || 'sine';

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  function stopPhrasePlayback() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  function playSuccessSound() {
    var ctx = getAudioContext();
    if (!ctx) return;
    resumeContext(ctx).then(function() {
      var t = ctx.currentTime;
      playTone(ctx, 523.25, t, 0.1, { volume: 0.22 });
      playTone(ctx, 659.25, t + 0.1, 0.12, { volume: 0.22 });
      playTone(ctx, 783.99, t + 0.2, 0.18, { volume: 0.2 });
    }).catch(function() { /* ignore */ });
  }

  function playFailureSound() {
    var ctx = getAudioContext();
    if (!ctx) return;
    resumeContext(ctx).then(function() {
      var t = ctx.currentTime;
      playTone(ctx, 220, t, 0.15, { volume: 0.18, type: 'triangle' });
      playTone(ctx, 165, t + 0.12, 0.25, { volume: 0.16, type: 'triangle' });
    }).catch(function() { /* ignore */ });
  }

  window.AudioUtils = {
    stopPhrasePlayback: stopPhrasePlayback,
    playSuccessSound: playSuccessSound,
    playFailureSound: playFailureSound
  };
})();
