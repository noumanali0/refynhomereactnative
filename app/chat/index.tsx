import React, { useState } from 'react';
import { View, Text, SafeAreaView, FlatList, TextInput, TouchableOpacity, Linking, Alert } from 'react-native';
import { Header } from '../../src/components/common/Header';
import { AppButton } from '../../src/components/common/AppButton';

const MOCK_MESSAGES = [
  { id: '1', text: 'Hello! I need AC repair service.', isMine: true, time: '10:30 AM' },
  { id: '2', text: 'Sure! I can help you with that. What seems to be the problem?', isMine: false, time: '10:32 AM' },
  { id: '3', text: 'The AC is not cooling properly.', isMine: true, time: '10:33 AM' },
];

export default function Chat() {
  const [messages] = useState(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');

  const openWhatsApp = async () => {
    const phoneNumber = '+923022977298'; // Replace with the desired phone number
    const message = 'Hello from my React Native app!';
    const whatsappURL = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(whatsappURL);

      if (supported) {
        await Linking.openURL(whatsappURL);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed on your device or cannot be opened.');
      }
    } catch (error) {
      console.error('An error occurred while trying to open WhatsApp:', error);
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  };


  return (
    <View className="flex-1 bg-white">
      <Header title="Chat" showBack />

      <View className="bg-accent-50 p-4 border-b border-accent-200">
        <Text className="text-center text-accent-700 font-medium mb-3">
          💬 In-app chat is a placeholder. Use WhatsApp for real-time messaging.
        </Text>
        <AppButton
          title="Open WhatsApp"
          variant="secondary"
          onPress={openWhatsApp}
        />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        className="flex-1 px-4"
        contentContainerClassName="py-4"
        renderItem={({ item }) => (
          <View
            className={`mb-3 ${item.isMine ? 'items-end' : 'items-start'}`}
          >
            <View
              className={`max-w-3/4 px-4 py-3 rounded-2xl ${item.isMine ? 'bg-primary' : 'bg-gray-100'
                }`}
            >
              <Text className={item.isMine ? 'text-white' : 'text-gray-900'}>
                {item.text}
              </Text>
            </View>
            <Text className="text-xs text-gray-400 mt-1">{item.time}</Text>
          </View>
        )}
      />

      <View className="border-t border-gray-200 px-4 py-3 flex-row items-center">
        <TextInput
          className="flex-1 bg-gray-100 rounded-full px-4 py-3 mr-2"
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          editable={true}
        />
        <TouchableOpacity className="bg-primary w-12 h-12 rounded-full items-center justify-center"
        // onPress={h}
        >
          <Text className="text-white text-xl">➤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
