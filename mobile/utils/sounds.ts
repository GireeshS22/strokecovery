import { Audio } from 'expo-av';

// Free sound URLs (short, simple sounds)
const SOUND_URLS = {
  correct: 'https://cdn.freesound.org/previews/341/341695_5858296-lq.mp3', // Short success ding
  wrong: 'https://cdn.freesound.org/previews/142/142608_1840739-lq.mp3', // Short error buzz
  complete: 'https://cdn.freesound.org/previews/270/270402_5123851-lq.mp3', // Victory fanfare
  tap: 'https://cdn.freesound.org/previews/156/156031_2538033-lq.mp3', // Soft click
};

type SoundName = keyof typeof SOUND_URLS;

let loadedSounds: Partial<Record<SoundName, Audio.Sound>> = {};
let soundsEnabled = true;

// Preload all sounds for faster playback
export async function preloadSounds(): Promise<void> {
  try {
    // Set audio mode for game sounds
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    // Load all sounds
    for (const [name, url] of Object.entries(SOUND_URLS)) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false, volume: 0.7 }
        );
        loadedSounds[name as SoundName] = sound;
      } catch (err) {
        console.warn(`Failed to load sound: ${name}`, err);
      }
    }
  } catch (err) {
    console.warn('Failed to initialize audio:', err);
  }
}

// Play a sound by name
export async function playSound(name: SoundName): Promise<void> {
  if (!soundsEnabled) return;

  const sound = loadedSounds[name];
  if (sound) {
    try {
      await sound.setPositionAsync(0); // Reset to start
      await sound.playAsync();
    } catch (err) {
      console.warn(`Failed to play sound: ${name}`, err);
    }
  }
}

// Enable/disable sounds
export function setSoundsEnabled(enabled: boolean): void {
  soundsEnabled = enabled;
}

export function getSoundsEnabled(): boolean {
  return soundsEnabled;
}

// Cleanup sounds when app closes
export async function unloadSounds(): Promise<void> {
  for (const sound of Object.values(loadedSounds)) {
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }
  loadedSounds = {};
}
