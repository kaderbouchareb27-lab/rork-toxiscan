import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { getDeviceLanguage } from '@/utils/i18n';

const TOOLKIT_URL = process.env.EXPO_PUBLIC_TOOLKIT_URL ?? 'https://toolkit.rork.com';
const TOOLKIT_SECRET = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY ?? '';
const OPENAI_KEY = process.env.EXPO_PUBLIC_OPEN_AI ?? '';
const OPENAI_TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';

export type RecorderHandle = {
  stop: () => Promise<{ uri: string; mimeType: string } | null>;
  cancel: () => Promise<void>;
};

export async function startRecording(): Promise<RecorderHandle> {
  if (Platform.OS === 'web') {
    return startWebRecording();
  }
  return startNativeRecording();
}

async function startNativeRecording(): Promise<RecorderHandle> {
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('microphone_permission_denied');
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();
  console.log('[Voice] Native recording started');

  return {
    stop: async () => {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {
        console.log('[Voice] stop error', e);
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const uri = recording.getURI();
      if (!uri) return null;
      const mimeType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/m4a';
      return { uri, mimeType };
    },
    cancel: async () => {
      try {
        await recording.stopAndUnloadAsync();
      } catch {}
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    },
  };
}

async function startWebRecording(): Promise<RecorderHandle> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('microphone_not_supported');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mr = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  mr.ondataavailable = (e: BlobEvent) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    mr.onstop = () => resolve();
  });
  mr.start();
  console.log('[Voice] Web recording started');

  return {
    stop: async () => {
      if (mr.state !== 'inactive') mr.stop();
      await stopped;
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
      const uri = URL.createObjectURL(blob);
      return { uri, mimeType: blob.type };
    },
    cancel: async () => {
      if (mr.state !== 'inactive') mr.stop();
      await stopped;
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

export async function transcribeAudio(uri: string, mimeType: string): Promise<string> {
  if (!OPENAI_KEY) {
    throw new Error('openai_key_missing');
  }
  console.log('[Voice] Transcribing directly via OpenAI API:', uri.substring(0, 60));

  const form = new FormData();

  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'mp4' : 'wav';
    form.append('file', new File([blob], `voice.${ext}`, { type: blob.type || 'audio/webm' }));
  } else {
    const ext = mimeType.includes('m4a') ? 'm4a' : 'wav';
    form.append('file', {
      uri,
      name: `voice.${ext}`,
      type: mimeType || 'audio/m4a',
    } as unknown as Blob);
  }

  form.append('model', 'whisper-1');
  const lang = getDeviceLanguage();
  form.append('language', lang);

  const res = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[Voice] Transcription error', res.status, errText.substring(0, 300));
    throw new Error(`transcription_failed_${res.status}`);
  }

  const data = (await res.json()) as { text?: string };
  const text = (data.text ?? '').trim();
  console.log('[Voice] Transcribed:', text.substring(0, 80));
  return text;
}

const FRENCH_VOICE_ID = 'pNInz6obpgDQGcFmaJgB';
const ENGLISH_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';

let currentSound: Audio.Sound | null = null;

export async function stopSpeech(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {}
    currentSound = null;
  }
}

export async function speakText(text: string): Promise<void> {
  if (!TOOLKIT_SECRET) throw new Error('toolkit_secret_missing');
  await stopSpeech();

  const lang = getDeviceLanguage();
  const voiceId = lang === 'en' ? ENGLISH_VOICE_ID : FRENCH_VOICE_ID;
  const cleaned = text.slice(0, 1500);

  console.log('[Voice] TTS request, lang:', lang, 'length:', cleaned.length);

  const res = await fetch(`${TOOLKIT_URL}/v2/elevenlabs/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOOLKIT_SECRET}`,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: cleaned,
      model_id: 'eleven_multilingual_v2',
      output_format: 'mp3_44100_128',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[Voice] TTS error', res.status, errText.substring(0, 300));
    throw new Error(`tts_failed_${res.status}`);
  }

  if (Platform.OS === 'web') {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new window.Audio(url);
    await audio.play();
    return;
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const dataUri = `data:audio/mpeg;base64,${base64}`;

  await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
  const { sound } = await Audio.Sound.createAsync({ uri: dataUri }, { shouldPlay: true });
  currentSound = sound;
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      void sound.unloadAsync();
      if (currentSound === sound) currentSound = null;
    }
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  if (typeof btoa !== 'undefined') return btoa(binary);
  return Buffer.from(binary, 'binary').toString('base64');
}
