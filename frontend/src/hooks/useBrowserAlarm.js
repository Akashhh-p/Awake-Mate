import { useEffect, useRef } from "react";

const LEVELS = {
  soft: { frequency: 620, gain: 0.08, interval: 900 },
  medium: { frequency: 880, gain: 0.16, interval: 520 },
  very_loud: { frequency: 1100, gain: 0.28, interval: 260 },
  continuous: { frequency: 1250, gain: 0.34, interval: 0 },
};

export function useBrowserAlarm(status) {
  const audioRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainRef = useRef(null);
  const timerRef = useRef(null);

  function ensureAudio() {
    if (!audioRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioRef.current = new AudioContext();
    }
    if (audioRef.current.state === "suspended") {
      audioRef.current.resume();
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

  function startTone(levelName) {
    ensureAudio();
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
