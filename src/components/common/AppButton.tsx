import React from 'react';
import { TouchableOpacity, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import Text from './Text';
import { COLORS } from '@/constants/colors';
import { LinearGradient } from "expo-linear-gradient";

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradientColors?: string[];   // Optional custom gradient
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = "outline",
  size = 'medium',
  isLoading = false,
  disabled = false,
  className = '',
  style,
  textStyle,
  gradientColors = ["#2563EB", "#F97316"], // Default Gradient
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary';
      case 'secondary':
        return 'bg-accent';
      case 'outline':
        return 'bg-transparent border-2 border-white';
      case 'gradient':
        return ''; // gradient handled separately
      default:
        return 'bg-white';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'py-2 px-4';
      case 'medium':
        return 'py-3 px-6';
      case 'large':
        return 'py-4 px-8';
      default:
        return 'py-3 px-6';
    }
  };

  const getTextColor = () => {
    if (variant === 'outline') return COLORS.white;
    return COLORS.white; // default white
  };

  // -----------------------------
  // 🔵 GRADIENT BUTTON HANDLING
  // -----------------------------
  if (variant === "gradient") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || isLoading}
        activeOpacity={0.7}
        style={style}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className={`${getSizeClasses()} rounded-lg items-center justify-center ${disabled || isLoading ? 'opacity-50' : ''
            }`}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text
              type="body2"
              style={[{ fontWeight: "600", color: COLORS.white }, textStyle]}
              className="font-semibold text-base"
            >
              {title}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // -----------------------------
  // 🔵 NORMAL BUTTON
  // -----------------------------
  return (
    <TouchableOpacity
      className={`${getVariantClasses()} ${getSizeClasses()} rounded-lg items-center justify-center ${disabled || isLoading ? 'opacity-50' : ''
        } ${className}`}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      style={style}
    >
      {isLoading ? (
        <ActivityIndicator color={COLORS.white} />
      ) : (
        <Text
          type="body2"
          style={[{ fontWeight: "600", color: getTextColor() }, textStyle]}
          className="font-semibold text-base"
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};


// import React from 'react';
// import { TouchableOpacity, ActivityIndicator, ViewStyle } from 'react-native';
// import Text from './Text';
// import { COLORS } from '@/constants/colors';

// interface AppButtonProps {
//   title: string;
//   onPress: () => void;
//   variant?: 'primary' | 'secondary' | 'outline';
//   size?: 'small' | 'medium' | 'large';
//   isLoading?: boolean;
//   disabled?: boolean;
//   className?: string;
// }

// export const AppButton: React.FC<AppButtonProps> = ({
//   title,
//   onPress,
//   variant = 'primary',
//   size = 'medium',
//   isLoading = false,
//   disabled = false,
//   className = '',
// }) => {
//   const getVariantClasses = () => {
//     switch (variant) {
//       case 'primary':
//         return 'bg-primary';
//       case 'secondary':
//         return 'bg-accent';
//       case 'outline':
//         return 'bg-transparent border-2 border-primary';
//       default:
//         return 'bg-light';
//     }
//   };

//   const getSizeClasses = () => {
//     switch (size) {
//       case 'small':
//         return 'py-2 px-4';
//       case 'medium':
//         return 'py-3 px-6';
//       case 'large':
//         return 'py-4 px-8';
//       default:
//         return 'py-3 px-6';
//     }
//   };

//   const getTextColor = () => {
//     if (variant === 'outline') return 'text-primary';
//     return 'text-white';
//   };

//   return (
//     <TouchableOpacity
//       className={`${getVariantClasses()} ${getSizeClasses()} rounded-lg items-center justify-center ${disabled || isLoading ? 'opacity-50' : ''
//         } ${className}`}
//       onPress={onPress}
//       disabled={disabled || isLoading}
//       activeOpacity={0.7}
//     >
//       {isLoading ? (
//         <ActivityIndicator color="#FFFFFF" />
//       ) : (
//         <Text type='body2' style={{ fontWeight: "600", color: COLORS.white }} className={`${getTextColor()} font-semibold text-base`}>{title}</Text>
//       )}
//     </TouchableOpacity>
//   );
// };
