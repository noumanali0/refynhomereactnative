import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxStars = 5,
  size = 'medium',
  interactive = false,
  onRatingChange,
}) => {
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { fontSize: 14 };
      case 'medium':
        return { fontSize: 18 };
      case 'large':
        return { fontSize: 26 };
      default:
        return { fontSize: 18 };
    }
  };


  const renderStars = () => {
    return Array.from({ length: maxStars }, (_, index) => {
      const starIndex = index + 1;
      const isFilled = starIndex <= Math.floor(rating);
      const isHalf = starIndex === Math.ceil(rating) && rating % 1 !== 0;

      const StarComponent = interactive ? TouchableOpacity : View;
      const componentProps = interactive
        ? { onPress: () => onRatingChange?.(starIndex) }
        : {};

      return (
        <StarComponent key={index} {...componentProps}>
          <Text style={getSizeStyle()}>
            {isFilled ? '⭐' : isHalf ? '⭐' : '☆'}
          </Text>
        </StarComponent>
      );
    });
  };

  return <View className="flex-row items-center">{renderStars()}</View>;
};
