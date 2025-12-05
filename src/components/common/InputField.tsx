import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { moderateScale } from 'react-native-size-matters';

interface InputFieldProps extends TextInputProps {
  label?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ style, ...props }) => {
  return (
    <TextInput
      {...props}
      style={[styles.input, style]}
      placeholderTextColor="#94a3b8"
    />
  );
};

const styles = StyleSheet.create({
  input: {
    flex: 1,
    height: moderateScale(50),
    fontSize: moderateScale(15),
    color: '#1e293b',
  },
});


// import React from 'react';
// import { View, Text, TextInput, TextInputProps } from 'react-native';

// interface InputFieldProps extends TextInputProps {
//   label?: string;
//   error?: string;
//   containerClassName?: string;
// }

// export const InputField: React.FC<InputFieldProps> = ({
//   label,
//   error,
//   containerClassName = '',
//   ...textInputProps
// }) => {
//   return (
//     <View className={`mb-4 ${containerClassName}`}>
//       {label && <Text className="text-gray-700 font-medium mb-2">{label}</Text>}
//       <TextInput
//         className={`border ${
//           error ? 'border-error' : 'border-gray-300'
//         } rounded-lg px-4 py-3 text-base bg-white`}
//         placeholderTextColor="#9CA3AF"
//         {...textInputProps}
//       />
//       {error && <Text className="text-error text-sm mt-1">{error}</Text>}
//     </View>
//   );
// };
