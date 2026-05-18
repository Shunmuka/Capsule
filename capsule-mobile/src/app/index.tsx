import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage, getAuthToken, loginUser, registerUser } from '@/services/authApi';

type AuthMode = 'login' | 'signup';

export default function LoginScreen() {
  const { token, isLoading, login, logout } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isSignup = mode === 'signup';
  const isSubmitDisabled = isSubmitting || !email || !password || (isSignup && !username);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (isSignup) {
        await registerUser({
          username,
          email,
          password,
        });
      }

      const response = await loginUser({ email, password });
      const authToken = getAuthToken(response);

      await login(authToken);
      setSuccessMessage(isSignup ? 'Account created. Welcome to Capsule.' : 'Welcome back.');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <StatusBar style="light" />
        <ActivityIndicator color="#d4d4d8" />
        <Text className="mt-4 text-xs uppercase tracking-[3px] text-zinc-500">Restoring session</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-950">
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          contentContainerClassName="min-h-full justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="mb-10 items-center">
            <Text className="text-xs uppercase tracking-[4px] text-zinc-500">Time-locked memories</Text>
            <Text className="mt-4 font-serif text-6xl leading-[64px] text-zinc-50">Capsule</Text>
            <Text className="mt-5 max-w-[320px] text-center text-base leading-7 text-zinc-400">
              Seal today's moments and return when the future opens them.
            </Text>
          </View>

          <View>
            <View className="gap-5">
              {isSignup ? (
                <View>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-zinc-500">
                    Username
                  </Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setUsername}
                    placeholder="yourname"
                    placeholderTextColor="#71717a"
                    className="h-14 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-base text-zinc-50"
                    value={username}
                  />
                </View>
              ) : null}

              <View>
                <Text className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-zinc-500">
                  Email
                </Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#71717a"
                  className="h-14 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-base text-zinc-50"
                  value={email}
                />
              </View>

              <View>
                <Text className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-zinc-500">
                  Password
                </Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#71717a"
                  secureTextEntry
                  className="h-14 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-base text-zinc-50"
                  value={password}
                />
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
                className={`mt-1 h-14 items-center justify-center rounded-2xl bg-white ${
                  isSubmitDisabled ? 'opacity-50' : 'active:bg-zinc-300'
                }`}>
                {isSubmitting ? (
                  <ActivityIndicator color="#09090b" />
                ) : (
                  <Text className="text-base font-bold text-zinc-950">
                    {isSignup ? 'Create account' : 'Login'}
                  </Text>
                )}
              </Pressable>

              {isSignup ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => switchMode('login')}
                  className="items-center py-2 active:opacity-70">
                  <Text className="text-xs font-semibold uppercase tracking-[3px] text-zinc-500">
                    I already have an account
                  </Text>
                </Pressable>
              ) : null}

              {!isSignup ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => switchMode('signup')}
                  className="h-14 w-full items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 active:bg-zinc-900">
                  <Text className="text-sm font-semibold uppercase tracking-[3px] text-zinc-100">
                    Create account
                  </Text>
                </Pressable>
              ) : null}

              {token ? (
                <View className="items-center border-t border-zinc-800 pt-4">
                  <Text className="text-center text-xs uppercase tracking-[2px] text-zinc-500">
                    JWT saved securely
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={logout}
                    className="mt-3 rounded-full border border-zinc-800 px-5 py-3 active:bg-zinc-800">
                    <Text className="text-xs font-semibold uppercase tracking-[3px] text-zinc-300">
                      Logout
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>

          <Text className="mt-8 text-center text-[11px] uppercase tracking-[3px] text-zinc-600">
            Built for moments worth waiting for
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
