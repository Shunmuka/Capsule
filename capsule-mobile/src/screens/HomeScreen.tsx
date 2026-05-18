import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const { logout } = useAuth();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Unlocked</Text>
        </View>

        <Text style={styles.title}>Welcome to Capsule</Text>
        <Text style={styles.subtitle}>
          Your session is active. The next step is building the capsule dashboard experience.
        </Text>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Authentication state</Text>
          <Text style={styles.panelTitle}>JWT stored securely</Text>
          <Text style={styles.panelText}>
            This screen only renders after the app restores or receives a backend-issued token.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={logout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030712',
  },
  topGlow: {
    position: 'absolute',
    top: -130,
    left: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(99, 102, 241, 0.26)',
  },
  bottomGlow: {
    position: 'absolute',
    right: -110,
    bottom: -150,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(124, 58, 237, 0.26)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.34)',
    borderRadius: 999,
    backgroundColor: 'rgba(88, 28, 135, 0.45)',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  badgeText: {
    color: '#ddd6fe',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fafc',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 24,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 360,
  },
  panel: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.84)',
    marginTop: 34,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
  },
  panelLabel: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  panelTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
  },
  panelText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.38)',
    backgroundColor: 'rgba(30, 41, 59, 0.78)',
    marginTop: 24,
  },
  logoutButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  logoutText: {
    color: '#f5f3ff',
    fontSize: 16,
    fontWeight: '900',
  },
});
