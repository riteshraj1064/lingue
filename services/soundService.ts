// services/soundService.ts
import { Platform } from "react-native";
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";

const SOUND_SOURCES = {
  correct: require("../assets/audio/correct_answer.wav"),
  wrong: require("../assets/audio/wrong_answer.wav"),
  collect: require("../assets/audio/xp_reward.wav"),
  complete: require("../assets/audio/lesson_complete.wav"),
  heartLost: require("../assets/audio/heart_lost.wav"),
  streak: require("../assets/audio/streak_fire.wav"),
  tap: require("../assets/audio/button_tap.wav"),
  hint: require("../assets/audio/hint_open.wav"),
  levelUp: require("../assets/audio/level_up.wav"),
  combo: require("../assets/audio/combo_bonus.wav"),
} as const;

export type SoundName = keyof typeof SOUND_SOURCES;

class SoundService {
  private players: Partial<Record<SoundName, AudioPlayer>> = {};
  private isEnabled: boolean = true;
  private isAudioModeConfigured: boolean = false;

  constructor() {
    this.configureAudioMode();
  }

  private async configureAudioMode() {
    if (this.isAudioModeConfigured || Platform.OS === "web") return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
      this.isAudioModeConfigured = true;
    } catch (e) {
      // Audio mode configuration is non-fatal
      console.log("[SoundService] Audio mode config info:", e);
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public async play(name: SoundName): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await this.configureAudioMode();

      let player = this.players[name];
      if (!player) {
        player = createAudioPlayer(SOUND_SOURCES[name]);
        this.players[name] = player;
      }

      // Seek to start and play
      try {
        player.seekTo(0);
      } catch {
        // Seek error is non-fatal
      }
      player.play();
    } catch (error) {
      console.log(`[SoundService] Error playing sound "${name}":`, error);
    }
  }

  // Convenient sound trigger helpers
  public playCorrect() {
    return this.play("correct");
  }

  public playWrong() {
    return this.play("wrong");
  }

  public playCollect() {
    return this.play("collect");
  }

  public playComplete() {
    return this.play("complete");
  }

  public playHeartLost() {
    return this.play("heartLost");
  }

  public playStreak() {
    return this.play("streak");
  }

  public playTap() {
    return this.play("tap");
  }

  public playHint() {
    return this.play("hint");
  }

  public playLevelUp() {
    return this.play("levelUp");
  }

  public playCombo() {
    return this.play("combo");
  }
}

export const soundService = new SoundService();
export default soundService;
