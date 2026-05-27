import { useEffect, useRef } from "react";

const LEVELS = {
  low: { frequency: 520, gain: 0.07, interval: 1100 },
  soft: { frequency: 620, gain: 0.08, interval: 900 },
  medium: { frequency: 880, gain: 0.24, interval: 480 },
  very_loud: { frequency: 1100, gain: 0.42, interval: 220 },
  continuous: { frequency: 1250, gain: 0.48, interval: 0 },
};

export function useBrowserAlarm(status) {
  const audioRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainRef = useRef(null);
  const timerRef = useRef(null);
  const unlockedRef = useRef(false);

  async function ensureAudio() {
    if (!audioRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioRef.current = new AudioContext();
    }
    if (audioRef.current.state === "suspended") {
      await audioRef.current.resume();
    }
    if (!unlockedRef.current) {
      const audio = audioRef.current;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.03);
      unlockedRef.current = true;
    }
  }

  function stopTone() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
    if (gainRef.current) {
      gainRef.current.disconnect();
      gainRef.current = null;
    }
    navigator.vibrate?.(0);
  }

  function stopCurrentOscillator() {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
    if (gainRef.current) {
      gainRef.current.disconnect();
      gainRef.current = null;
    }
  }

  async function startTone(levelName) {
    await ensureAudio();
    stopTone();
    const level = LEVELS[levelName] || LEVELS.medium;
    const audio = audioRef.current;

    const playOnce = () => {
      stopCurrentOscillator();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = level.frequency;
      gain.gain.value = level.gain;
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillatorRef.current = oscillator;
      gainRef.current = gain;
      if (level.interval) {
        setTimeout(() => {
          if (oscillatorRef.current === oscillator) {
            stopCurrentOscillator();
          }
        }, Math.min(220, level.interval - 40));
      }
      navigator.vibrate?.(levelName === "continuous" || levelName === "very_loud" ? [240, 120, 240] : [180, 100]);
    };

    playOnce();
    if (level.interval) {
      timerRef.current = setInterval(playOnce, level.interval);
    }
  }

  useEffect(() => {
    if (status.alarm_status === "On") {
      startTone(status.alert_level);
    } else {
      stopTone();
    }

    return stopTone;
  }, [status.alarm_status, status.alert_level]);

  return { unlockAudio: ensureAudio, stopAlarm: stopTone };
}
