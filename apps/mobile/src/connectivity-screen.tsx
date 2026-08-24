import { useHealthConnection } from '@adventure-omakase/api-client/react';
import { tokens } from '@adventure-omakase/design-tokens';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ConnectivityScreen({ apiBaseUrl }: { apiBaseUrl: string }) {
  const { connection, retry } = useHealthConnection(apiBaseUrl);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Mobile foundation</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Adventure Omakase
          </Text>
          <Text style={styles.description}>Technical connectivity status</Text>
        </View>

        <View style={styles.section} accessibilityLiveRegion="polite">
          <Text style={styles.sectionLabel}>Technical tracer</Text>
          {connection.status === 'loading' ? (
            <View style={styles.statusRow}>
              <ActivityIndicator
                accessibilityLabel="Checking API connection"
                color={tokens.color.warning}
              />
              <Text style={styles.statusTitle}>Checking API connection</Text>
            </View>
          ) : null}

          {connection.status === 'connected' ? (
            <View style={styles.statusBlock}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, styles.connectedDot]} />
                <Text style={styles.statusTitle}>Connected</Text>
              </View>
              <Text style={styles.statusDetail}>
                {connection.health.service}
              </Text>
              <Text style={styles.statusDetail}>
                Version {connection.health.version}
              </Text>
            </View>
          ) : null}

          {connection.status === 'unavailable' ? (
            <View style={styles.statusBlock}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, styles.unavailableDot]} />
                <Text style={styles.statusTitle}>Unavailable</Text>
              </View>
              <Text style={styles.statusDetail}>
                The API health contract could not be verified.
              </Text>
              <Pressable
                accessibilityLabel="Retry API connection"
                accessibilityRole="button"
                onPress={() => void retry()}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.buttonText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: tokens.color.background,
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: tokens.space[5],
    paddingVertical: tokens.space[6],
  },
  header: {
    borderBottomColor: tokens.color.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: tokens.space[6],
  },
  eyebrow: {
    color: tokens.color.accent,
    fontSize: tokens.type.size.small,
    fontWeight: tokens.type.weight.bold,
    lineHeight: tokens.type.lineHeight.small,
    marginBottom: tokens.space[2],
    textTransform: 'uppercase',
  },
  title: {
    color: tokens.color.textPrimary,
    fontSize: tokens.type.size.title,
    fontWeight: tokens.type.weight.bold,
    lineHeight: tokens.type.lineHeight.title,
    marginBottom: tokens.space[3],
  },
  description: {
    color: tokens.color.textSecondary,
    fontSize: tokens.type.size.body,
    lineHeight: tokens.type.lineHeight.body,
  },
  section: {
    backgroundColor: tokens.color.surfaceElevated,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.medium,
    borderWidth: 1,
    marginTop: tokens.space[6],
    padding: tokens.space[5],
  },
  sectionLabel: {
    color: tokens.color.textSecondary,
    fontSize: tokens.type.size.small,
    lineHeight: tokens.type.lineHeight.small,
    marginBottom: tokens.space[3],
  },
  statusBlock: {
    gap: tokens.space[2],
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space[3],
    minHeight: tokens.size.minimumTouchTarget,
  },
  statusDot: {
    borderRadius: tokens.radius.round,
    height: 10,
    width: 10,
  },
  connectedDot: {
    backgroundColor: tokens.color.success,
  },
  unavailableDot: {
    backgroundColor: tokens.color.danger,
  },
  statusTitle: {
    color: tokens.color.textPrimary,
    fontSize: tokens.type.size.body,
    fontWeight: tokens.type.weight.medium,
    lineHeight: tokens.type.lineHeight.body,
  },
  statusDetail: {
    color: tokens.color.textSecondary,
    fontSize: tokens.type.size.small,
    lineHeight: tokens.type.lineHeight.small,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: tokens.color.accent,
    borderRadius: tokens.radius.small,
    justifyContent: 'center',
    marginTop: tokens.space[3],
    minHeight: tokens.size.minimumTouchTarget,
    minWidth: 96,
    paddingHorizontal: tokens.space[4],
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    color: tokens.color.accentContrast,
    fontSize: tokens.type.size.body,
    fontWeight: tokens.type.weight.medium,
  },
});
