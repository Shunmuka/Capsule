import React from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import HomeScreen from '@/screens/HomeScreen';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthNavigator />
    </AuthProvider>
  );
}

function AuthNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#a78bfa" />
        <Text style={styles.loadingText}>Restoring session...</Text>
      </View>
    );
  }

  if (token) {
    return <HomeScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="explore" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
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
