export const PRESET_AVATARS = [
  { id: 'avatar1', emoji: '🧘', bg: 'bg-gradient-to-br from-rose-400 to-orange-300', label: '冥想' },
  { id: 'avatar2', emoji: '🌸', bg: 'bg-gradient-to-br from-pink-400 to-rose-300', label: '樱花' },
  { id: 'avatar3', emoji: '🌿', bg: 'bg-gradient-to-br from-emerald-400 to-teal-300', label: '绿叶' },
  { id: 'avatar4', emoji: '☀️', bg: 'bg-gradient-to-br from-amber-400 to-yellow-300', label: '阳光' },
  { id: 'avatar5', emoji: '🌊', bg: 'bg-gradient-to-br from-blue-400 to-cyan-300', label: '海浪' },
] as const;

export type PresetAvatar = (typeof PRESET_AVATARS)[number];

export function resolveAvatarSource(avatarUrl?: string | null): {
  imageUrl: string | null;
  preset: PresetAvatar | null;
} {
  if (!avatarUrl) {
    return { imageUrl: null, preset: null };
  }

  if (avatarUrl.startsWith('preset:')) {
    const presetId = avatarUrl.slice('preset:'.length);
    const preset = PRESET_AVATARS.find((item) => item.id === presetId) ?? null;
    return { imageUrl: null, preset };
  }

  return { imageUrl: avatarUrl, preset: null };
}
