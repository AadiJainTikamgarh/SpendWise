import { View, Text, ActivityIndicator } from 'react-native';

export default function AuthCallback() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
      }}
    >
      <ActivityIndicator color="#fff" />
      <Text style={{ color: '#fff', marginTop: 16 }}>
        Completing sign in...
      </Text>
    </View>
  );
}