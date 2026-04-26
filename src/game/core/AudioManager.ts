const START_FREQUENCY = 520;
const DAMAGE_FREQUENCY = 140;
const GAME_OVER_FREQUENCY = 90;
const START_DURATION_SECONDS = 0.08;
const DAMAGE_DURATION_SECONDS = 0.12;
const GAME_OVER_DURATION_SECONDS = 0.35;
const MASTER_GAIN = 0.08;
const END_GAIN = 0.001;

type BrowserAudioContext = AudioContext & {
  close(): Promise<void>;
};

type BrowserWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export class AudioManager {
  private audioContext: BrowserAudioContext | null = null;

  public unlock(): void {
    void this.resumeAudioContext();
  }

  public playStart(): void {
    void this.playTone(START_FREQUENCY, START_DURATION_SECONDS, 'triangle');
  }

  public playDamage(): void {
    void this.playTone(DAMAGE_FREQUENCY, DAMAGE_DURATION_SECONDS, 'sawtooth');
  }

  public playGameOver(): void {
    void this.playTone(GAME_OVER_FREQUENCY, GAME_OVER_DURATION_SECONDS, 'sine');
  }

  public destroy(): void {
    void this.audioContext?.close();
    this.audioContext = null;
  }

  private async playTone(
    frequency: number,
    durationSeconds: number,
    oscillatorType: OscillatorType,
  ): Promise<void> {
    const audioContext = await this.resumeAudioContext();

    if (audioContext === null) {
      return;
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const startTime = audioContext.currentTime;
    const endTime = startTime + durationSeconds;

    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.type = oscillatorType;
    gain.gain.setValueAtTime(MASTER_GAIN, startTime);
    gain.gain.exponentialRampToValueAtTime(END_GAIN, endTime);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startTime);
    oscillator.stop(endTime);
  }

  private async resumeAudioContext(): Promise<BrowserAudioContext | null> {
    const audioContext = this.getAudioContext();

    if (audioContext === null) {
      return null;
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    return audioContext;
  }

  private getAudioContext(): BrowserAudioContext | null {
    if (this.audioContext !== null) {
      return this.audioContext;
    }

    const AudioContextClass =
      window.AudioContext ?? (window as BrowserWindow).webkitAudioContext;

    if (AudioContextClass === undefined) {
      return null;
    }

    this.audioContext = new AudioContextClass() as BrowserAudioContext;

    return this.audioContext;
  }
}
