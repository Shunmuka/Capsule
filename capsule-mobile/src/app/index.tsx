import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator color="#a78bfa" />
        <Text style={styles.loadingText}>Restoring session...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.logoShell}>
              <Text style={styles.logoText}>C</Text>
            </View>
            <Text style={styles.eyebrow}>Time-locked memories</Text>
            <Text style={styles.title}>Capsule</Text>
            <Text style={styles.subtitle}>
              Seal today's moments and return when the future opens them.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.segmentedControl}>
              <Pressable
                accessibilityRole="button"
                onPress={() => switchMode('login')}
                style={[styles.segmentButton, !isSignup && styles.segmentButtonActive]}>
                <Text style={[styles.segmentText, !isSignup && styles.segmentTextActive]}>
                  Login
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => switchMode('signup')}
                style={[styles.segmentButton, isSignup && styles.segmentButtonActive]}>
                <Text style={[styles.segmentText, isSignup && styles.segmentTextActive]}>
                  Sign up
                </Text>
              </Pressable>
            </View>

            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{isSignup ? 'Create your vault' : 'Welcome back'}</Text>
              <Text style={styles.formSubtitle}>
                {isSignup
                  ? 'Start saving memories behind a time lock.'
                  : 'Sign in to continue building your capsules.'}
              </Text>
            </View>

            <View style={styles.form}>
              {isSignup ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setUsername}
                    placeholder="yourname"
                    placeholderTextColor="#64748b"
                    style={styles.input}
                    value={username}
                  />
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#64748b"
                  style={styles.input}
                  value={email}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
              </View>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View style={styles.successBox}>
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitDisabled}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isSubmitDisabled && styles.primaryButtonDisabled,
                  pressed && !isSubmitDisabled && styles.primaryButtonPressed,
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isSignup ? 'Create account' : 'Login'}
                  </Text>
                )}
              </Pressable>

              {token ? (
                <View style={styles.sessionPanel}>
                  <Text style={styles.sessionText}>JWT saved securely for this session.</Text>
                  <Pressable accessibilityRole="button" onPress={logout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Logout</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030712',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 34,
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: 'rgba(124, 58, 237, 0.34)',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -150,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(79, 70, 229, 0.22)',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoShell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    height: 76,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.45)',
    backgroundColor: 'rgba(88, 28, 135, 0.58)',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  logoText: {
    color: '#f5f3ff',
    fontSize: 34,
    fontWeight: '800',
  },
  eyebrow: {
    marginTop: 18,
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    color: '#f8fafc',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 310,
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    padding: 5,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    minHeight: 42,
  },
  segmentButtonActive: {
    backgroundColor: '#7c3aed',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  segmentText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  formHeader: {
    marginTop: 22,
    marginBottom: 18,
  },
  formTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
  },
  formSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  form: {
    gap: 14,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    minHeight: 54,
    borderColor: 'rgba(148, 163, 184, 0.22)',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.76)',
    color: '#f8fafc',
    fontSize: 16,
    paddingHorizontal: 16,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#7c3aed',
    marginTop: 4,
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.48,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  errorBox: {
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    borderRadius: 16,
    backgroundColor: 'rgba(127, 29, 29, 0.32)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 14,
  },
  successBox: {
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.28)',
    borderRadius: 16,
    backgroundColor: 'rgba(6, 78, 59, 0.28)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successText: {
    color: '#bbf7d0',
    fontSize: 14,
  },
  sessionPanel: {
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.18)',
    marginTop: 4,
    paddingTop: 14,
  },
  sessionText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  logoutText: {
    color: '#ddd6fe',
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#030712',
  },
  loadingText: {
    color: '#c4b5fd',
    fontSize: 14,
  },
});
