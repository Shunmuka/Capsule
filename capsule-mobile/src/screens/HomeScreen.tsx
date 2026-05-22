import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import {
  addCapsuleImages,
  createCapsule,
  getCapsuleDetails,
  getCapsules,
  getCapsulesErrorMessage,
  updateCapsuleCoverImage,
  updateCapsuleRevealDate,
} from '@/services/capsulesApi';
import type { Capsule, CapsuleDetail } from '@/services/capsulesApi';

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

const getDefaultRevealDate = () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setSeconds(0, 0);

  return tomorrow;
};

const getStartOfDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
};

const isSameDay = (firstDate: Date, secondDate: Date) =>
  firstDate.getFullYear() === secondDate.getFullYear() &&
  firstDate.getMonth() === secondDate.getMonth() &&
  firstDate.getDate() === secondDate.getDate();

const getCalendarDays = (monthDate: Date) => {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
};

const formatSelectedRevealDate = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

const formatCalendarMonth = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date);

const getHour12 = (date: Date) => {
  const hour = date.getHours() % 12;
  return hour === 0 ? 12 : hour;
};

const setRevealDateDay = (currentDate: Date, day: Date) => {
  const nextDate = new Date(day);
  nextDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
  return nextDate;
};

const setRevealDateHour = (currentDate: Date, hour12: number) => {
  const nextDate = new Date(currentDate);
  const isPm = currentDate.getHours() >= 12;
  const nextHour = (hour12 % 12) + (isPm ? 12 : 0);
  nextDate.setHours(nextHour, nextDate.getMinutes(), 0, 0);
  return nextDate;
};

const setRevealDateMinute = (currentDate: Date, minute: number) => {
  const nextDate = new Date(currentDate);
  nextDate.setMinutes(minute, 0, 0);
  return nextDate;
};

const setRevealDatePeriod = (currentDate: Date, period: 'AM' | 'PM') => {
  const nextDate = new Date(currentDate);
  const currentHour = nextDate.getHours();

  if (period === 'AM' && currentHour >= 12) {
    nextDate.setHours(currentHour - 12);
  }

  if (period === 'PM' && currentHour < 12) {
    nextDate.setHours(currentHour + 12);
  }

  return nextDate;
};

const normalizeTimeInput = (value: string) => value.replace(/\D/g, '');

type CapsuleCardProps = {
  capsule: Capsule;
  now: number;
  width: number;
  imageHeight: number;
  onOpenActions: (capsule: Capsule) => void;
  onViewDetails: (capsule: Capsule) => void;
};

function CapsuleCard({ capsule, now, width, imageHeight, onOpenActions, onViewDetails }: CapsuleCardProps) {
  const countdown = useMemo(() => getCountdownParts(capsule.revealAt, now), [capsule.revealAt, now]);
  const imageUrls = capsule.imageUrls ?? [];
  const coverImageUrl = capsule.coverImageUrl ?? imageUrls[0];
  const isUsingFallbackCover = !capsule.coverImageUrl && Boolean(imageUrls[0]);
  const handleLongPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onOpenActions(capsule);
  };

  return (
    <Pressable
      accessibilityRole="button"
      delayLongPress={320}
      onLongPress={handleLongPress}
      onPress={() => onViewDetails(capsule)}
      className="overflow-hidden rounded-[18px] border border-zinc-800/80 bg-zinc-900/70 active:border-zinc-600 active:bg-zinc-900"
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        width,
      })}>
      {coverImageUrl ? (
        <View>
          <Image
            blurRadius={!countdown.isUnlocked && isUsingFallbackCover ? 18 : 0}
            source={{ uri: coverImageUrl }}
            className="w-full bg-zinc-900"
            resizeMode="cover"
            style={{ height: imageHeight }}
          />
          {imageUrls.length > 1 ? (
            <View className="absolute right-3 top-3 rounded-full border border-zinc-300/30 bg-zinc-950/65 px-3 py-1">
              <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-zinc-100">
                {imageUrls.length} photos
              </Text>
            </View>
          ) : null}
          {!countdown.isUnlocked ? (
            <View
              className="absolute inset-0 items-center justify-center bg-zinc-950/25"
              pointerEvents="none">
              <View className="rounded-full border border-zinc-300/30 bg-zinc-950/55 px-4 py-2">
                <Text className="text-[10px] font-semibold uppercase tracking-[3px] text-zinc-100">
                  Locked
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <View
          className="w-full items-center justify-center border-b border-zinc-800/70 bg-zinc-900"
          style={{ height: imageHeight }}>
          <Text className="font-serif text-2xl text-zinc-600">Capsule</Text>
        </View>
      )}

      <View className="p-4">
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 pr-1">
            <Text className="font-serif text-lg leading-6 text-zinc-50" numberOfLines={2}>
              {capsule.title}
            </Text>
            <Text className="mt-1 text-[9px] uppercase tracking-[1.5px] text-zinc-500" numberOfLines={2}>
              {countdown.isUnlocked ? 'Ready to open' : 'Sealed until'} {formatRevealDate(capsule.revealAt)}
            </Text>
          </View>

          <View className="w-[130px] items-center rounded-2xl border border-zinc-800/80 bg-zinc-950/65 px-3 py-3">
            {countdown.isUnlocked ? (
              <View className="min-h-[44px] items-center justify-center">
                <Text className="text-[8px] font-semibold uppercase tracking-[1.5px] text-zinc-500">Open</Text>
                <Text className="mt-1 text-[11px] font-semibold uppercase tracking-[2px] text-zinc-100">
                  Ready
                </Text>
              </View>
            ) : (
              <View className="items-center">
                <Text className="text-[8px] font-semibold uppercase tracking-[1.5px] text-zinc-500">Opens In</Text>
                <View className="mt-1.5 flex-row items-center justify-center">
                  <Text className="font-mono text-[17px] font-semibold leading-5 text-zinc-50">
                    {countdown.days}
                  </Text>
                  <Text className="px-0.5 font-mono text-sm font-semibold leading-5 text-zinc-500">:</Text>
                  <Text className="font-mono text-[17px] font-semibold leading-5 text-zinc-50">
                    {countdown.hours}
                  </Text>
                  <Text className="px-0.5 font-mono text-sm font-semibold leading-5 text-zinc-500">:</Text>
                  <Text className="font-mono text-[17px] font-semibold leading-5 text-zinc-50">
                    {countdown.minutes}
                  </Text>
                </View>
                <View className="mt-1 flex-row justify-center">
                  <CompactCountdownUnit label="Days" />
                  <CompactCountdownUnit label="Hrs" />
                  <CompactCountdownUnit label="Min" />
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function CompactCountdownUnit({ label }: { label: string }) {
  return (
    <View className="w-[34px] items-center">
      <Text className="text-[7px] font-semibold uppercase tracking-[0.8px] text-zinc-600">{label}</Text>
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

type AddImagesModalProps = {
  capsule: Capsule | null;
  token: string | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
};

type ChangeCoverModalProps = {
  capsule: Capsule | null;
  token: string | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
};

type RevealDateTimeSelectorProps = {
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
  minimumDate?: Date;
};

type TimeField = 'hour' | 'minute' | null;

function RevealDateTimeSelector({ value, onChange, disabled = false, minimumDate }: RevealDateTimeSelectorProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const [focusedTimeField, setFocusedTimeField] = useState<TimeField>(null);
  const [hourText, setHourText] = useState(() => formatUnit(getHour12(value)));
  const [minuteText, setMinuteText] = useState(() => formatUnit(value.getMinutes()));
  const selectedMonth = value.getMonth();
  const selectedYear = value.getFullYear();
  const minimumRevealAt = minimumDate?.getTime();
  const minimumCalendarDay = useMemo(
    () => getStartOfDay(minimumDate && Number.isFinite(minimumDate.getTime()) ? minimumDate : new Date()),
    [minimumDate],
  );
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const hour12 = getHour12(value);
  const minute = value.getMinutes();
  const period = value.getHours() >= 12 ? 'PM' : 'AM';

  useEffect(() => {
    setVisibleMonth(new Date(selectedYear, selectedMonth, 1));
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (!focusedTimeField) {
      setHourText(formatUnit(hour12));
      setMinuteText(formatUnit(minute));
    }
  }, [focusedTimeField, hour12, minute]);

  const commitDateChange = (nextDate: Date) => {
    if (minimumRevealAt && nextDate.getTime() < minimumRevealAt) {
      onChange(new Date(minimumRevealAt));
      return;
    }

    onChange(nextDate);
  };

  const changeMonth = (monthOffset: number) => {
    setVisibleMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, 1));
  };

  const handleHourInput = (nextValue: string) => {
    const normalizedValue = normalizeTimeInput(nextValue).slice(0, 2);
    setHourText(normalizedValue);

    const nextHour = Number(normalizedValue);
    if (normalizedValue && nextHour >= 1 && nextHour <= 12) {
      commitDateChange(setRevealDateHour(value, nextHour));
    }
  };

  const handleMinuteInput = (nextValue: string) => {
    const normalizedValue = normalizeTimeInput(nextValue).slice(0, 2);
    setMinuteText(normalizedValue);

    const nextMinute = Number(normalizedValue);
    if (normalizedValue && nextMinute >= 0 && nextMinute <= 59) {
      commitDateChange(setRevealDateMinute(value, nextMinute));
    }
  };

  const commitTimeInput = () => {
    setFocusedTimeField(null);

    if (!hourText || !minuteText) {
      const midnightDate = setRevealDatePeriod(setRevealDateMinute(setRevealDateHour(value, 12), 0), 'AM');
      commitDateChange(midnightDate);
      setHourText('12');
      setMinuteText('00');
      return;
    }

    const nextHour = Number(hourText);
    const nextMinute = Number(minuteText);
    const safeHour = nextHour >= 1 && nextHour <= 12 ? nextHour : 12;
    const safeMinute = nextMinute >= 0 && nextMinute <= 59 ? nextMinute : 0;

    commitDateChange(setRevealDateMinute(setRevealDateHour(value, safeHour), safeMinute));
    setHourText(formatUnit(safeHour));
    setMinuteText(formatUnit(safeMinute));
  };

  return (
    <View className="gap-4">
      <View className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
        <Text className="text-[10px] font-semibold uppercase tracking-[3px] text-zinc-500">
          Opens
        </Text>
        <Text className="mt-1 font-serif text-2xl text-zinc-50">{formatSelectedRevealDate(value)}</Text>
      </View>

      <View className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
        <View className="mb-3 flex-row items-center justify-between">
          <Pressable
            accessibilityLabel="Previous month"
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => changeMonth(-1)}
            className="h-10 w-10 items-center justify-center rounded-full border border-zinc-800 active:bg-zinc-900">
            <Text className="text-xl text-zinc-300">{'<'}</Text>
          </Pressable>

          <Text className="text-sm font-semibold uppercase tracking-[2px] text-zinc-200">
            {formatCalendarMonth(visibleMonth)}
          </Text>

          <Pressable
            accessibilityLabel="Next month"
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => changeMonth(1)}
            className="h-10 w-10 items-center justify-center rounded-full border border-zinc-800 active:bg-zinc-900">
            <Text className="text-xl text-zinc-300">{'>'}</Text>
          </Pressable>
        </View>

        <View className="mb-2 flex-row">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, index) => (
            <Text key={`${dayLabel}-${index}`} className="flex-1 text-center text-[10px] font-semibold text-zinc-600">
              {dayLabel}
            </Text>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {calendarDays.map((day) => {
            const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
            const isSelected = isSameDay(day, value);
            const isPast = getStartOfDay(day).getTime() < minimumCalendarDay.getTime();

            return (
              <Pressable
                accessibilityRole="button"
                disabled={disabled || isPast}
                key={day.toISOString()}
                onPress={() => commitDateChange(setRevealDateDay(value, day))}
                style={{ width: `${100 / 7}%` }}
                className={`h-10 items-center justify-center rounded-full ${
                  isSelected ? 'bg-zinc-100' : isPast ? 'opacity-30' : 'active:bg-zinc-900'
                }`}>
                <Text
                  className={`text-sm ${
                    isSelected ? 'font-bold text-zinc-950' : isCurrentMonth ? 'text-zinc-200' : 'text-zinc-700'
                  }`}>
                  {day.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <Text className="mb-3 text-[10px] font-semibold uppercase tracking-[3px] text-zinc-500">
          Time
        </Text>

        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 items-center rounded-2xl border border-zinc-800 bg-zinc-900/50 px-3 py-4">
            <TextInput
              accessibilityLabel="Hour"
              editable={!disabled}
              keyboardType="number-pad"
              maxLength={2}
              onBlur={commitTimeInput}
              onChangeText={handleHourInput}
              onFocus={() => setFocusedTimeField('hour')}
              selectTextOnFocus
              className="my-1 min-h-14 w-full text-center font-mono text-4xl text-zinc-50"
              value={hourText}
            />
            <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-zinc-500">Hour</Text>
          </View>

          <Text className="font-mono text-3xl text-zinc-600">:</Text>

          <View className="flex-1 items-center rounded-2xl border border-zinc-800 bg-zinc-900/50 px-3 py-4">
            <TextInput
              accessibilityLabel="Minute"
              editable={!disabled}
              keyboardType="number-pad"
              maxLength={2}
              onBlur={commitTimeInput}
              onChangeText={handleMinuteInput}
              onFocus={() => setFocusedTimeField('minute')}
              selectTextOnFocus
              className="my-1 min-h-14 w-full text-center font-mono text-4xl text-zinc-50"
              value={minuteText}
            />
            <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-zinc-500">Minute</Text>
          </View>

          <View className="w-20 gap-2">
            {(['AM', 'PM'] as const).map((periodOption) => (
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                key={periodOption}
                onPress={() => commitDateChange(setRevealDatePeriod(value, periodOption))}
                className={`h-12 items-center justify-center rounded-xl border ${
                  period === periodOption
                    ? 'border-zinc-100 bg-zinc-100'
                    : 'border-zinc-800 bg-zinc-900/50 active:bg-zinc-800'
                }`}>
                <Text
                  className={`text-sm font-bold ${
                    period === periodOption ? 'text-zinc-950' : 'text-zinc-300'
                  }`}>
                  {periodOption}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function AddCapsuleModal({ isVisible, token, onClose, onCreated }: AddCapsuleModalProps) {
  const [title, setTitle] = useState('');
  const [revealAt, setRevealAt] = useState(getDefaultRevealDate);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const resetForm = useCallback(() => {
    setTitle('');
    setRevealAt(getDefaultRevealDate());
    setSelectedImages([]);
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
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.86,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setSelectedImages(
      result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName ?? `capsule-${Date.now()}-${index + 1}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
        file: asset.file,
      })),
    );
  };

  const handleSubmit = async () => {
    if (!token) {
      setErrorMessage('Please log in again before creating a capsule.');
      return;
    }

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setErrorMessage('Give your capsule a title.');
      return;
    }

    if (revealAt.getTime() <= Date.now()) {
      setErrorMessage('Choose a reveal time in the future.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await createCapsule(token, {
        title: trimmedTitle,
        revealAt: revealAt.toISOString(),
        images: selectedImages,
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

  const isSubmitDisabled = isSubmitting || !title.trim() || !token;

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

              <View className="gap-3">
                <Text className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-zinc-500">
                  Reveal date and time
                </Text>
                <RevealDateTimeSelector disabled={isSubmitting} onChange={setRevealAt} value={revealAt} />
              </View>

              <View>
                <Text className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-zinc-500">
                  Images
                </Text>

                {selectedImages.length ? (
                  <View className="gap-3">
                    <View className="flex-row items-center justify-between gap-3">
                      <Text className="flex-1 text-sm text-zinc-400">
                        {selectedImages.length} {selectedImages.length === 1 ? 'image' : 'images'} selected
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isSubmitting}
                        onPress={() => setSelectedImages([])}
                        className="rounded-full border border-zinc-700 px-3 py-2 active:bg-zinc-800">
                        <Text className="text-xs font-semibold uppercase tracking-[2px] text-zinc-300">
                          Clear
                        </Text>
                      </Pressable>
                    </View>

                    <View className="flex-row flex-wrap gap-3">
                      {selectedImages.map((image) => (
                        <View
                          className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                          key={`${image.uri}-${image.name}`}
                          style={{ width: '47%' }}>
                          <Image source={{ uri: image.uri }} className="h-28 w-full" resizeMode="cover" />
                          <View className="gap-2 p-3">
                            <Text className="text-xs text-zinc-300" numberOfLines={1}>
                              {image.name}
                            </Text>
                            <Pressable
                              accessibilityRole="button"
                              disabled={isSubmitting}
                              onPress={() =>
                                setSelectedImages((currentImages) =>
                                  currentImages.filter((currentImage) => currentImage.uri !== image.uri),
                                )
                              }
                              className="items-center rounded-full border border-zinc-700 px-3 py-2 active:bg-zinc-800">
                              <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-zinc-300">
                                Remove
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      disabled={isSubmitting}
                      onPress={handlePickImage}
                      className="h-12 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 active:bg-zinc-900">
                      <Text className="text-xs font-semibold uppercase tracking-[3px] text-zinc-300">
                        Choose different images
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={handlePickImage}
                    className="h-28 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 active:bg-zinc-900">
                    <Text className="text-sm font-semibold uppercase tracking-[3px] text-zinc-300">
                      Choose images
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

function AddImagesModal({ capsule, token, onClose, onUpdated }: AddImagesModalProps) {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const isVisible = Boolean(capsule);

  const resetModal = useCallback(() => {
    setSelectedImages([]);
    setErrorMessage('');
    setSuccessMessage('');
  }, []);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    resetModal();
    onClose();
  };

  const handlePickImages = async () => {
    setErrorMessage('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Photo library access is needed to add images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.86,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    setSelectedImages(
      result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName ?? `capsule-add-${Date.now()}-${index + 1}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
        file: asset.file,
      })),
    );
  };

  const handleSubmit = async () => {
    if (!token) {
      setErrorMessage('Please log in again before adding images.');
      return;
    }

    if (!capsule) {
      setErrorMessage('Choose a capsule before adding images.');
      return;
    }

    if (!selectedImages.length) {
      setErrorMessage('Choose at least one image to upload.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await addCapsuleImages(token, capsule.id, selectedImages);
      setSuccessMessage('Images added successfully.');
      await onUpdated();
      resetModal();
      onClose();
    } catch (error) {
      setErrorMessage(getCapsulesErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal animationType="fade" transparent visible={isVisible} onRequestClose={handleClose}>
      <View className="flex-1 justify-end bg-black/70">
        <Pressable className="flex-1" disabled={isSubmitting} onPress={handleClose} />

        <View className="max-h-[86%] rounded-t-[28px] border border-zinc-800 bg-zinc-950">
          <ScrollView contentContainerClassName="px-5 pb-8 pt-5" showsVerticalScrollIndicator={false}>
            <View className="mb-5 flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xs uppercase tracking-[4px] text-zinc-500">Add Images</Text>
                <Text className="mt-2 font-serif text-3xl text-zinc-50" numberOfLines={2}>
                  {capsule?.title ?? 'Capsule'}
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Close add images form"
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={handleClose}
                className="h-10 w-10 items-center justify-center rounded-full border border-zinc-800 active:bg-zinc-900">
                <Text className="text-2xl leading-7 text-zinc-300">x</Text>
              </Pressable>
            </View>

            <View className="gap-4">
              {selectedImages.length ? (
                <View className="gap-3">
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="flex-1 text-sm text-zinc-400">
                      {selectedImages.length} {selectedImages.length === 1 ? 'image' : 'images'} ready to upload
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isSubmitting}
                      onPress={() => setSelectedImages([])}
                      className="rounded-full border border-zinc-700 px-3 py-2 active:bg-zinc-800">
                      <Text className="text-xs font-semibold uppercase tracking-[2px] text-zinc-300">Clear</Text>
                    </Pressable>
                  </View>

                  <View className="flex-row flex-wrap gap-3">
                    {selectedImages.map((image) => (
                      <View
                        className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                        key={`${image.uri}-${image.name}`}
                        style={{ width: '47%' }}>
                        <Image source={{ uri: image.uri }} className="h-28 w-full" resizeMode="cover" />
                        <View className="gap-2 p-3">
                          <Text className="text-xs text-zinc-300" numberOfLines={1}>
                            {image.name}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            disabled={isSubmitting}
                            onPress={() =>
                              setSelectedImages((currentImages) =>
                                currentImages.filter((currentImage) => currentImage.uri !== image.uri),
                              )
                            }
                            className="items-center rounded-full border border-zinc-700 px-3 py-2 active:bg-zinc-800">
                            <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-zinc-300">
                              Remove
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handlePickImages}
                  className="h-28 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 active:bg-zinc-900">
                  <Text className="text-sm font-semibold uppercase tracking-[3px] text-zinc-300">Choose Images</Text>
                </Pressable>
              )}

              {selectedImages.length ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handlePickImages}
                  className="h-12 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 active:bg-zinc-900">
                  <Text className="text-xs font-semibold uppercase tracking-[3px] text-zinc-300">
                    Choose Different Images
                  </Text>
                </Pressable>
              ) : null}

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
                disabled={isSubmitting || !selectedImages.length}
                onPress={handleSubmit}
                className={`h-14 items-center justify-center rounded-2xl bg-white ${
                  isSubmitting || !selectedImages.length ? 'opacity-50' : 'active:bg-zinc-300'
                }`}>
                {isSubmitting ? (
                  <ActivityIndicator color="#09090b" />
                ) : (
                  <Text className="text-base font-bold text-zinc-950">Upload Images</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ChangeCoverModal({ capsule, token, onClose, onUpdated }: ChangeCoverModalProps) {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const isVisible = Boolean(capsule);

  const resetModal = useCallback(() => {
    setSelectedImage(null);
    setErrorMessage('');
    setSuccessMessage('');
  }, []);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    resetModal();
    onClose();
  };

  const handlePickImage = async () => {
    setErrorMessage('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Photo library access is needed to change the cover.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: false,
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    setSelectedImage({
      uri: asset.uri,
      name: asset.fileName ?? `capsule-cover-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
      file: asset.file,
    });
  };

  const handleSubmit = async () => {
    if (!token) {
      setErrorMessage('Please log in again before changing the cover.');
      return;
    }

    if (!capsule) {
      setErrorMessage('Choose a capsule before changing its cover.');
      return;
    }

    if (!selectedImage) {
      setErrorMessage('Choose a cover image first.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await updateCapsuleCoverImage(token, capsule.id, selectedImage);
      setSuccessMessage('Cover image updated successfully.');
      await onUpdated();
      resetModal();
      onClose();
    } catch (error) {
      setErrorMessage(getCapsulesErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal animationType="fade" transparent visible={isVisible} onRequestClose={handleClose}>
      <View className="flex-1 justify-end bg-black/70">
        <Pressable className="flex-1" disabled={isSubmitting} onPress={handleClose} />

        <View className="max-h-[86%] rounded-t-[28px] border border-zinc-800 bg-zinc-950">
          <ScrollView contentContainerClassName="px-5 pb-8 pt-5" showsVerticalScrollIndicator={false}>
            <View className="mb-5 flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xs uppercase tracking-[4px] text-zinc-500">Cover Image</Text>
                <Text className="mt-2 font-serif text-3xl text-zinc-50" numberOfLines={2}>
                  {capsule?.title ?? 'Capsule'}
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Close cover image form"
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={handleClose}
                className="h-10 w-10 items-center justify-center rounded-full border border-zinc-800 active:bg-zinc-900">
                <Text className="text-2xl leading-7 text-zinc-300">x</Text>
              </Pressable>
            </View>

            <View className="gap-4">
              {selectedImage ? (
                <View className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                  <Image source={{ uri: selectedImage.uri }} className="h-56 w-full" resizeMode="cover" />
                  <View className="p-3">
                    <Text className="text-xs text-zinc-300" numberOfLines={1}>
                      {selectedImage.name}
                    </Text>
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handlePickImage}
                  className="h-32 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 active:bg-zinc-900">
                  <Text className="text-sm font-semibold uppercase tracking-[3px] text-zinc-300">
                    Choose Cover Image
                  </Text>
                </Pressable>
              )}

              {selectedImage ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handlePickImage}
                  className="h-12 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 active:bg-zinc-900">
                  <Text className="text-xs font-semibold uppercase tracking-[3px] text-zinc-300">
                    Choose Different Cover
                  </Text>
                </Pressable>
              ) : null}

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
                disabled={isSubmitting || !selectedImage}
                onPress={handleSubmit}
                className={`h-14 items-center justify-center rounded-2xl bg-white ${
                  isSubmitting || !selectedImage ? 'opacity-50' : 'active:bg-zinc-300'
                }`}>
                {isSubmitting ? (
                  <ActivityIndicator color="#09090b" />
                ) : (
                  <Text className="text-base font-bold text-zinc-950">Save Cover Image</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type EditRevealDateModalProps = {
  capsule: Capsule | null;
  token: string | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
};

type CapsuleDetailScreenProps = {
  capsuleId: string | null;
  token: string | null;
  now: number;
  initialViewMode: 'grid' | 'sequential';
  onClose: () => void;
};

function CapsuleDetailScreen({ capsuleId, token, now, initialViewMode, onClose }: CapsuleDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'grid' | 'sequential'>(initialViewMode);
  const [capsule, setCapsule] = useState<CapsuleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isVisible = Boolean(capsuleId);
  const countdown = useMemo(
    () => (capsule ? getCountdownParts(capsule.revealAt, now) : null),
    [capsule, now],
  );
  const detailPhotos = capsule?.photos ?? [];
  const detailMembers = capsule?.members ?? [];
  const isUnlocked = Boolean(capsule?.isRevealed) || Boolean(countdown?.isUnlocked);

  useEffect(() => {
    if (!capsuleId || !token) {
      setCapsule(null);
      return;
    }

    let isMounted = true;

    const loadCapsuleDetails = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const nextCapsule = await getCapsuleDetails(token, capsuleId);
        if (isMounted) {
          setCapsule(nextCapsule);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getCapsulesErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCapsuleDetails();

    return () => {
      isMounted = false;
    };
  }, [capsuleId, token]);

  useEffect(() => {
    if (capsuleId) {
      setViewMode(initialViewMode);
    }
  }, [capsuleId, initialViewMode]);

  const uploaderLabel = (uploaderId: string, uploaderName?: string) => {
    const member = detailMembers.find((currentMember) => currentMember.id === uploaderId);
    return uploaderName ?? member?.username ?? 'Someone';
  };

  return (
    <Modal animationType="slide" visible={isVisible} onRequestClose={onClose}>
      <View className="flex-1 bg-zinc-950" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="flex-row items-center justify-between border-b border-zinc-900 px-5 py-4">
          <View className="flex-1 pr-4">
            <Text className="text-xs uppercase tracking-[4px] text-zinc-500">
              {isUnlocked ? 'Gallery' : 'Countdown'}
            </Text>
            <Text className="mt-1 font-serif text-3xl text-zinc-50" numberOfLines={1}>
              {capsule?.title ?? 'Capsule'}
            </Text>
          </View>

          {isUnlocked ? (
            <View className="mr-3 flex-row rounded-full border border-zinc-800 bg-zinc-950 p-1">
              <Pressable
                accessibilityRole="button"
                onPress={() => setViewMode('grid')}
                className={`h-9 items-center justify-center rounded-full px-4 ${
                  viewMode === 'grid' ? 'bg-zinc-200' : 'active:bg-zinc-900'
                }`}>
                <Text
                  className={`text-xs font-bold uppercase tracking-[1px] ${
                    viewMode === 'grid' ? 'text-zinc-950' : 'text-zinc-500'
                  }`}>
                  Grid
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setViewMode('sequential')}
                className={`h-9 items-center justify-center rounded-full px-4 ${
                  viewMode === 'sequential' ? 'bg-zinc-200' : 'active:bg-zinc-900'
                }`}>
                <Text
                  className={`text-xs font-bold uppercase tracking-[1px] ${
                    viewMode === 'sequential' ? 'text-zinc-950' : 'text-zinc-500'
                  }`}>
                  Feed
                </Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            accessibilityLabel="Close capsule details"
            accessibilityRole="button"
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full border border-zinc-800 active:bg-zinc-900">
            <Text className="text-2xl leading-7 text-zinc-300">x</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#d4d4d8" />
            <Text className="mt-4 text-sm tracking-[2px] text-zinc-500">Loading capsule</Text>
          </View>
        ) : errorMessage ? (
          <View className="flex-1 justify-center px-5">
            <View className="rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-3">
              <Text className="text-sm leading-5 text-red-200">{errorMessage}</Text>
            </View>
          </View>
        ) : capsule ? (
          <ScrollView contentContainerClassName="px-5 pb-8 pt-5" showsVerticalScrollIndicator={false}>
            {!capsule.isRevealed && countdown ? (
              <View className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <Text className="text-[10px] font-semibold uppercase tracking-[3px] text-zinc-500">
                  Opens {formatRevealDate(capsule.revealAt)}
                </Text>
                <View className="mt-4 flex-row items-center justify-between">
                  <CountdownUnit label="D" value={countdown.days} />
                  <CountdownUnit label="H" value={countdown.hours} />
                  <CountdownUnit label="M" value={countdown.minutes} />
                  <CountdownUnit label="S" value={countdown.seconds} />
                </View>
                <Text className="mt-4 text-sm leading-5 text-zinc-400">
                  {capsule.photoCount} {capsule.photoCount === 1 ? 'photo is' : 'photos are'} sealed until the reveal.
                </Text>
              </View>
            ) : null}

            {isUnlocked ? (
              <View className={viewMode === 'grid' ? 'flex-row flex-wrap justify-between' : 'gap-6'}>
                {detailPhotos.map((photo) => (
                  <View
                    className={`overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 ${
                      viewMode === 'grid' ? 'mb-2 w-[49%]' : 'w-full'
                    }`}
                    key={photo.id}>
                    {photo.imageUrl ? (
                      <Image
                        source={{ uri: photo.imageUrl }}
                        className={viewMode === 'grid' ? 'aspect-square w-full' : 'aspect-[4/3] w-full'}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        className={`items-center justify-center bg-zinc-900 ${
                          viewMode === 'grid' ? 'aspect-square w-full' : 'aspect-[4/3] w-full'
                        }`}>
                        <Text className="text-xs font-semibold uppercase tracking-[3px] text-zinc-600">Media</Text>
                      </View>
                    )}
                    <View className="px-4 py-3">
                      <Text className="text-xs uppercase tracking-[2px] text-zinc-500">
                        Uploaded by {uploaderLabel(photo.uploaderId, photo.uploader?.username)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {detailPhotos.map((photo) => (
                  <View
                    className="min-h-36 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"
                    key={photo.id}
                    style={{ width: '47%' }}>
                    <View className="flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950/80">
                      <Text className="text-xs font-semibold uppercase tracking-[3px] text-zinc-600">Camera</Text>
                    </View>
                    <Text className="mt-3 text-xs font-semibold text-zinc-300" numberOfLines={1}>
                      {uploaderLabel(photo.uploaderId, photo.uploader?.username)}
                    </Text>
                    <Text className="mt-1 text-[10px] uppercase tracking-[2px] text-zinc-600">
                      Hidden
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {!detailPhotos.length ? (
              <View className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <Text className="font-serif text-2xl text-zinc-50">No photos yet</Text>
                <Text className="mt-2 leading-5 text-zinc-400">
                  Uploaded photos will appear here once contributors add them.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

type CapsuleActionSheetProps = {
  capsule: Capsule | null;
  now: number;
  onClose: () => void;
  onChangeCover: (capsule: Capsule) => void;
  onUploadImages: (capsule: Capsule) => void;
  onUpdateRevealDate: (capsule: Capsule) => void;
};

type CapsuleAction = {
  label: string;
  description: string;
  onPress: () => void;
};

function CapsuleActionSheet({
  capsule,
  now,
  onClose,
  onChangeCover,
  onUploadImages,
  onUpdateRevealDate,
}: CapsuleActionSheetProps) {
  const isVisible = Boolean(capsule);
  const isRevealed = capsule
    ? Boolean(capsule.isRevealed) || getCountdownParts(capsule.revealAt, now).isUnlocked
    : false;
  const hasUploads = (capsule?._count.photos ?? 0) > 0;

  const actions: CapsuleAction[] = capsule
    ? isRevealed
      ? [
          {
            label: 'Change Capsule Cover',
            description: 'Pick a new public cover image for this capsule.',
            onPress: () => onChangeCover(capsule),
          },
        ]
      : [
          {
            label: 'Upload Images',
            description: 'Add sealed photos to this capsule.',
            onPress: () => onUploadImages(capsule),
          },
          {
            label: 'Change Capsule Cover',
            description: 'Pick a new public cover image for this capsule.',
            onPress: () => onChangeCover(capsule),
          },
          {
            label: hasUploads ? 'Extend Countdown Timer' : 'Change Reveal Date',
            description: hasUploads
              ? 'Move the reveal later without shortening the timer.'
              : 'Choose when this empty capsule opens.',
            onPress: () => onUpdateRevealDate(capsule),
          },
        ]
    : [];

  const handleActionPress = (action: CapsuleAction) => {
    action.onPress();
    onClose();
  };

  return (
    <Modal animationType="slide" transparent visible={isVisible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="rounded-t-3xl border border-zinc-800 bg-zinc-950 px-5 pb-8 pt-5">
          <View className="mb-4">
            <Text className="text-xs font-semibold uppercase tracking-[4px] text-zinc-500">Capsule Actions</Text>
            <Text className="mt-2 font-serif text-2xl text-zinc-50" numberOfLines={2}>
              {capsule?.title ?? 'Capsule'}
            </Text>
          </View>

          <View className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
            {actions.map((action, index) => (
              <View key={action.label}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleActionPress(action)}
                  className="px-4 py-4 active:bg-zinc-900">
                  <Text className="text-base font-semibold text-zinc-50">{action.label}</Text>
                  <Text className="mt-1 text-sm leading-5 text-zinc-400">{action.description}</Text>
                </Pressable>
                {index < actions.length - 1 ? <View className="h-px bg-zinc-800" /> : null}
              </View>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            className="mt-3 h-12 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 active:bg-zinc-900">
            <Text className="text-sm font-semibold uppercase tracking-[2px] text-zinc-300">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function EditRevealDateModal({ capsule, token, onClose, onUpdated }: EditRevealDateModalProps) {
  const [revealAt, setRevealAt] = useState(() => new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const isVisible = Boolean(capsule);
  const hasUploads = (capsule?._count.photos ?? 0) > 0;
  const currentRevealAt = useMemo(() => {
    const parsedRevealAt = capsule ? new Date(capsule.revealAt) : new Date();
    return Number.isFinite(parsedRevealAt.getTime()) ? parsedRevealAt : new Date();
  }, [capsule]);
  const isUnlocked = Boolean(capsule?.isRevealed) || currentRevealAt.getTime() <= Date.now();
  const minimumDate = hasUploads ? currentRevealAt : new Date();

  useEffect(() => {
    if (capsule) {
      const parsedRevealAt = new Date(capsule.revealAt);
      setRevealAt(Number.isFinite(parsedRevealAt.getTime()) ? parsedRevealAt : getDefaultRevealDate());
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [capsule]);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!token) {
      setErrorMessage('Please log in again before updating this capsule.');
      return;
    }

    if (!capsule) {
      setErrorMessage('Choose a capsule before updating its reveal date.');
      return;
    }

    if (isUnlocked) {
      setErrorMessage('Unlocked capsules cannot have their reveal date changed.');
      return;
    }

    if (revealAt.getTime() <= Date.now()) {
      setErrorMessage('Choose a reveal time in the future.');
      return;
    }

    if (hasUploads && revealAt.getTime() < currentRevealAt.getTime()) {
      setErrorMessage('Uploaded photos lock this capsule into extension-only mode.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await updateCapsuleRevealDate(token, capsule.id, revealAt.toISOString());
      setSuccessMessage('Reveal date updated successfully.');
      await onUpdated();
      onClose();
    } catch (error) {
      setErrorMessage(getCapsulesErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

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
                <Text className="text-xs uppercase tracking-[4px] text-zinc-500">
                  {hasUploads ? 'Extension Only' : 'Reveal Date'}
                </Text>
                <Text className="mt-2 font-serif text-3xl text-zinc-50" numberOfLines={2}>
                  {capsule?.title ?? 'Capsule'}
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Close reveal date form"
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={handleClose}
                className="h-10 w-10 items-center justify-center rounded-full border border-zinc-800 active:bg-zinc-900">
                <Text className="text-2xl leading-7 text-zinc-300">x</Text>
              </Pressable>
            </View>

            <View className="gap-4">
              {isUnlocked ? (
                <View className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-5">
                  <Text className="text-sm leading-5 text-zinc-300">
                    This capsule has already unlocked, so its reveal date can no longer be changed.
                  </Text>
                </View>
              ) : (
                <RevealDateTimeSelector
                  disabled={isSubmitting}
                  minimumDate={minimumDate}
                  onChange={setRevealAt}
                  value={revealAt}
                />
              )}

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
                disabled={isSubmitting || isUnlocked}
                onPress={handleSubmit}
                className={`h-14 items-center justify-center rounded-2xl ${
                  hasUploads ? 'bg-amber-500 active:bg-amber-400' : 'bg-zinc-200 active:bg-zinc-300'
                } ${isSubmitting || isUnlocked ? 'opacity-50' : ''}`}>
                {isSubmitting ? (
                  <ActivityIndicator color="#09090b" />
                ) : (
                  <Text className="text-base font-bold text-zinc-950">
                    {hasUploads ? 'Extend Countdown Timer' : 'Change Reveal Date'}
                  </Text>
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
  const [selectedCapsuleForImages, setSelectedCapsuleForImages] = useState<Capsule | null>(null);
  const [selectedCapsuleForCover, setSelectedCapsuleForCover] = useState<Capsule | null>(null);
  const [selectedCapsuleForDate, setSelectedCapsuleForDate] = useState<Capsule | null>(null);
  const [selectedCapsuleForActions, setSelectedCapsuleForActions] = useState<Capsule | null>(null);
  const [selectedCapsuleIdForDetails, setSelectedCapsuleIdForDetails] = useState<string | null>(null);
  const [detailViewMode, setDetailViewMode] = useState<'grid' | 'sequential'>('grid');

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
  const cardWidth = Math.floor(viewportWidth - listPadding * 2);
  const imageHeight = Math.min(280, Math.max(210, cardWidth * 0.62));

  const openCapsuleDetails = useCallback((capsule: Capsule, viewMode: 'grid' | 'sequential' = 'grid') => {
    setDetailViewMode(viewMode);
    setSelectedCapsuleIdForDetails(capsule.id);
  }, []);

  const renderCapsule = useCallback(
    ({ item }: { item: Capsule }) => (
      <CapsuleCard
        capsule={item}
        now={now}
        width={cardWidth}
        imageHeight={imageHeight}
        onOpenActions={setSelectedCapsuleForActions}
        onViewDetails={openCapsuleDetails}
      />
    ),
    [cardWidth, imageHeight, now, openCapsuleDetails],
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
            refreshing={isRefreshing}
            onRefresh={() => loadCapsules({ refreshing: true })}
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-5 pb-28"
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

      <AddImagesModal
        capsule={selectedCapsuleForImages}
        token={token}
        onClose={() => setSelectedCapsuleForImages(null)}
        onUpdated={() => loadCapsules({ refreshing: true })}
      />

      <ChangeCoverModal
        capsule={selectedCapsuleForCover}
        token={token}
        onClose={() => setSelectedCapsuleForCover(null)}
        onUpdated={() => loadCapsules({ refreshing: true })}
      />

      <EditRevealDateModal
        capsule={selectedCapsuleForDate}
        token={token}
        onClose={() => setSelectedCapsuleForDate(null)}
        onUpdated={() => loadCapsules({ refreshing: true })}
      />

      <CapsuleActionSheet
        capsule={selectedCapsuleForActions}
        now={now}
        onClose={() => setSelectedCapsuleForActions(null)}
        onChangeCover={setSelectedCapsuleForCover}
        onUploadImages={setSelectedCapsuleForImages}
        onUpdateRevealDate={setSelectedCapsuleForDate}
      />

      <CapsuleDetailScreen
        capsuleId={selectedCapsuleIdForDetails}
        token={token}
        now={now}
        initialViewMode={detailViewMode}
        onClose={() => setSelectedCapsuleIdForDetails(null)}
      />
    </SafeAreaView>
  );
}
