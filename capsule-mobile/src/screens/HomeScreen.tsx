import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { Capsule, createCapsule, getCapsules, getCapsulesErrorMessage } from '@/services/capsulesApi';

type CountdownParts = {
  isUnlocked: boolean;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

const formatUnit = (value: number) => value.toString().padStart(2, '0');

const getCountdownParts = (revealAt: string, now: number): CountdownParts => {
  const revealTime = new Date(revealAt).getTime();
  const remainingMs = revealTime - now;

  if (!Number.isFinite(revealTime) || remainingMs <= 0) {
    return {
      isUnlocked: true,
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
    };
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    isUnlocked: false,
    days: formatUnit(days),
    hours: formatUnit(hours),
    minutes: formatUnit(minutes),
    seconds: formatUnit(seconds),
  };
};

const formatRevealDate = (revealAt: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(revealAt));

const getDefaultRevealInput = () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const year = tomorrow.getFullYear();
  const month = formatUnit(tomorrow.getMonth() + 1);
  const day = formatUnit(tomorrow.getDate());
  const hours = formatUnit(tomorrow.getHours());
  const minutes = formatUnit(tomorrow.getMinutes());

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const parseRevealInput = (value: string) => {
  const normalizedValue = value.trim().replace(' ', 'T');
  const revealDate = new Date(normalizedValue);

  return Number.isFinite(revealDate.getTime()) ? revealDate : null;
};

type CapsuleCardProps = {
  capsule: Capsule;
  now: number;
  width: number;
  imageHeight: number;
};

function CapsuleCard({ capsule, now, width, imageHeight }: CapsuleCardProps) {
  const countdown = useMemo(() => getCountdownParts(capsule.revealAt, now), [capsule.revealAt, now]);

  return (
    <View className="overflow-hidden rounded-[18px] border border-zinc-800/80 bg-zinc-900/70" style={{ width }}>
      {capsule.imageUrl ? (
        <Image source={{ uri: capsule.imageUrl }} className="w-full bg-zinc-900" resizeMode="cover" style={{ height: imageHeight }} />
      ) : (
        <View
          className="w-full items-center justify-center border-b border-zinc-800/70 bg-zinc-900"
          style={{ height: imageHeight }}>
          <Text className="font-serif text-2xl text-zinc-600">Capsule</Text>
        </View>
      )}

      <View className="p-3">
        <View className="mb-3 flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <Text className="font-serif text-lg leading-6 text-zinc-50" numberOfLines={2}>
              {capsule.title}
            </Text>
            <Text className="mt-1 text-[9px] uppercase tracking-[1.5px] text-zinc-500" numberOfLines={2}>
              {countdown.isUnlocked ? 'Ready to open' : 'Sealed until'} {formatRevealDate(capsule.revealAt)}
            </Text>
          </View>

          <View className="rounded-full border border-zinc-700 px-2 py-1">
            <Text className="text-[9px] font-semibold uppercase tracking-[1px] text-zinc-300">
              {countdown.isUnlocked ? 'Open' : 'Locked'}
            </Text>
          </View>
        </View>

        <View className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-2 py-2">
          <View className="flex-row items-center justify-between">
            <CountdownUnit label="D" value={countdown.days} />
            <CountdownUnit label="H" value={countdown.hours} />
            <CountdownUnit label="M" value={countdown.minutes} />
            <CountdownUnit label="S" value={countdown.seconds} />
          </View>
        </View>
      </View>
    </View>
  );
}

function CountdownUnit({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-7 items-center">
      <Text className="font-mono text-sm text-zinc-50">{value}</Text>
      <Text className="mt-0.5 text-[8px] uppercase text-zinc-500">{label}</Text>
    </View>
  );
}

type SelectedImage = {
  uri: string;
  name: string;
  type: string;
  file?: Blob;
};

type AddCapsuleModalProps = {
  isVisible: boolean;
  token: string | null;
  onClose: () => void;
  onCreated: () => Promise<void>;
};

function AddCapsuleModal({ isVisible, token, onClose, onCreated }: AddCapsuleModalProps) {
  const [title, setTitle] = useState('');
  const [revealAtInput, setRevealAtInput] = useState(getDefaultRevealInput);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const resetForm = useCallback(() => {
    setTitle('');
    setRevealAtInput(getDefaultRevealInput());
    setSelectedImage(null);
    setErrorMessage('');
    setSuccessMessage('');
  }, []);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    resetForm();
    onClose();
  };

  const handlePickImage = async () => {
    setErrorMessage('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Photo library access is needed to attach an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.86,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    setSelectedImage({
      uri: asset.uri,
      name: asset.fileName ?? `capsule-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
      file: asset.file,
    });
  };

  const handleSubmit = async () => {
    if (!token) {
      setErrorMessage('Please log in again before creating a capsule.');
      return;
    }

    const trimmedTitle = title.trim();
    const revealDate = parseRevealInput(revealAtInput);

    if (!trimmedTitle) {
      setErrorMessage('Give your capsule a title.');
      return;
    }

    if (!revealDate) {
      setErrorMessage('Use a reveal date like 2026-05-19 09:30.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await createCapsule(token, {
        title: trimmedTitle,
        revealAt: revealDate.toISOString(),
        image: selectedImage,
      });
      setSuccessMessage('Capsule sealed successfully.');
      await onCreated();
      resetForm();
      onClose();
    } catch (error) {
      setErrorMessage(getCapsulesErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || !title.trim() || !revealAtInput.trim() || !token;

  return (
    <Modal animationType="fade" transparent visible={isVisible} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/70">
        <Pressable className="flex-1" disabled={isSubmitting} onPress={handleClose} />

        <View className="max-h-[92%] rounded-t-[28px] border border-zinc-800 bg-zinc-950">
          <ScrollView
            contentContainerClassName="px-5 pb-8 pt-5"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View className="mb-5 flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xs uppercase tracking-[4px] text-zinc-500">New Capsule</Text>
                <Text className="mt-2 font-serif text-3xl text-zinc-50">Seal a memory</Text>
              </View>

              <Pressable
                accessibilityLabel="Close add capsule form"
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={handleClose}
                className="h-10 w-10 items-center justify-center rounded-full border border-zinc-800 active:bg-zinc-900">
                <Text className="text-2xl leading-7 text-zinc-300">x</Text>
              </Pressable>
            </View>

            <View className="gap-5">
              <View>
                <Text className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-zinc-500">
                  Capsule title
                </Text>
                <TextInput
                  autoCapitalize="sentences"
                  editable={!isSubmitting}
                  onChangeText={setTitle}
                  placeholder="Summer evening, saved"
                  placeholderTextColor="#71717a"
                  className="h-14 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-base text-zinc-50"
                  value={title}
                />
              </View>

              <View>
                <Text className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-zinc-500">
                  Reveal date
                </Text>
                <TextInput
                  autoCapitalize="none"
                  editable={!isSubmitting}
                  onChangeText={setRevealAtInput}
                  placeholder="2026-05-19 09:30"
                  placeholderTextColor="#71717a"
                  className="h-14 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 font-mono text-base text-zinc-50"
                  value={revealAtInput}
                />
              </View>

              <View>
                <Text className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-zinc-500">
                  Image
                </Text>

                {selectedImage ? (
                  <View className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                    <Image source={{ uri: selectedImage.uri }} className="h-44 w-full" resizeMode="cover" />
                    <View className="flex-row items-center justify-between gap-3 px-4 py-3">
                      <Text className="flex-1 text-sm text-zinc-300" numberOfLines={1}>
                        {selectedImage.name}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isSubmitting}
                        onPress={() => setSelectedImage(null)}
                        className="rounded-full border border-zinc-700 px-3 py-2 active:bg-zinc-800">
                        <Text className="text-xs font-semibold uppercase tracking-[2px] text-zinc-300">
                          Remove
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={handlePickImage}
                    className="h-28 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 active:bg-zinc-900">
                    <Text className="text-sm font-semibold uppercase tracking-[3px] text-zinc-300">
                      Choose image
                    </Text>
                  </Pressable>
                )}
              </View>

              {errorMessage ? (
                <View className="rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-3">
                  <Text className="text-sm leading-5 text-red-200">{errorMessage}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View className="rounded-2xl border border-emerald-900/60 bg-emerald-950/25 px-4 py-3">
                  <Text className="text-sm leading-5 text-emerald-200">{successMessage}</Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitDisabled}
                onPress={handleSubmit}
                className={`h-14 items-center justify-center rounded-2xl bg-white ${
                  isSubmitDisabled ? 'opacity-50' : 'active:bg-zinc-300'
                }`}>
                {isSubmitting ? (
                  <ActivityIndicator color="#09090b" />
                ) : (
                  <Text className="text-base font-bold text-zinc-950">Seal capsule</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function HomeScreen() {
  const { token, logout } = useAuth();
  const { width: viewportWidth } = useWindowDimensions();
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAddCapsuleVisible, setIsAddCapsuleVisible] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const loadCapsules = useCallback(
    async ({ refreshing = false } = {}) => {
      if (!token) {
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage('');

      try {
        const nextCapsules = await getCapsules(token);
        setCapsules(nextCapsules);
      } catch (error) {
        setErrorMessage(getCapsulesErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadCapsules();
  }, [loadCapsules]);

  const listPadding = 20;
  const columnGap = 12;
  const cardWidth = Math.floor((viewportWidth - listPadding * 2 - columnGap) / 2);
  const imageHeight = Math.min(220, Math.max(150, cardWidth));

  const renderCapsule = useCallback(
    ({ item }: { item: Capsule }) => (
      <CapsuleCard capsule={item} now={now} width={cardWidth} imageHeight={imageHeight} />
    ),
    [cardWidth, imageHeight, now],
  );

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <StatusBar style="light" />

      <View className="flex-1 px-5">
        <View className="flex-row items-start justify-between pb-5 pt-3">
          <View>
            <Text className="text-xs uppercase tracking-[4px] text-zinc-500">Capsule Feed</Text>
            <Text className="mt-2 font-serif text-4xl text-zinc-50">Your memories</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={logout}
            className="rounded-full border border-zinc-800 px-4 py-2 active:bg-zinc-900">
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-zinc-400">Logout</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#d4d4d8" />
            <Text className="mt-4 text-sm tracking-[2px] text-zinc-500">Loading capsules</Text>
          </View>
        ) : (
          <FlatList
            data={capsules}
            keyExtractor={(item) => item.id}
            renderItem={renderCapsule}
            extraData={now}
            numColumns={2}
            columnWrapperStyle={{ gap: columnGap }}
            refreshing={isRefreshing}
            onRefresh={() => loadCapsules({ refreshing: true })}
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-3 pb-28"
            ListEmptyComponent={
              <View className="mt-20 rounded-[28px] border border-zinc-800 bg-zinc-900/60 p-7">
                <Text className="font-serif text-2xl text-zinc-50">No capsules yet</Text>
                <Text className="mt-3 leading-6 text-zinc-400">
                  Your feed will fill with sealed moments once you create your first capsule.
                </Text>
              </View>
            }
            ListHeaderComponent={
              errorMessage ? (
                <View className="mb-5 rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3">
                  <Text className="text-sm text-red-200">{errorMessage}</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>

      <Pressable
        accessibilityLabel="Create capsule"
        accessibilityRole="button"
        onPress={() => setIsAddCapsuleVisible(true)}
        className="absolute bottom-8 right-6 h-16 w-16 items-center justify-center rounded-full border border-zinc-700 bg-zinc-100 shadow-2xl active:bg-zinc-300">
        <Text className="-mt-1 text-4xl font-light text-zinc-950">+</Text>
      </Pressable>

      <AddCapsuleModal
        isVisible={isAddCapsuleVisible}
        token={token}
        onClose={() => setIsAddCapsuleVisible(false)}
        onCreated={() => loadCapsules({ refreshing: true })}
      />
    </SafeAreaView>
  );
}
