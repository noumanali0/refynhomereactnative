import React from 'react';
import { Text, View } from 'react-native';
// import { cn } from 'nativewind';

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-200 text-yellow-700',
    en_route: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-indigo-100 text-indigo-700',
    assigned: 'bg-purple-100 text-purple-700',
    waiting: 'bg-amber-100 text-amber-700',
    expired: 'bg-red-100 text-red-700',
};

export const StatusBadge = ({ status }: { status: string }) => {
    const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
    return (
        <View className={'px-3 py-1 rounded-full' + ' ' + color}>
            <Text className="text-xs font-medium capitalize">{status.replace('_', ' ')}</Text>
        </View>
    );
};
