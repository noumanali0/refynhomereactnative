import { useEffect, useState } from "react";

export const useCountdown = (initial: number) => {
    const [time, setTime] = useState(initial);

    useEffect(() => {
        if (time <= 0) return;

        const interval = setInterval(() => {
            setTime(prev => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [time]);

    const reset = () => setTime(initial);

    return { time, reset };
};
