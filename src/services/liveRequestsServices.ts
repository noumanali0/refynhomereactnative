// src/services/liveRequestsService.ts
// import type { LiveRequest } from './types';

import { LiveRequest } from "./types";


const DEFAULT_TTL_MS = 20 * 1000;
const GENERATE_INTERVAL_MS = 3000;
const BATCH_LIMIT = 200;

class LiveRequestsGeneratorClass {
    listeners: Array<(r: LiveRequest) => void> = [];
    running = false;
    interval: NodeJS.Timeout | null = null;
    buffer: LiveRequest[] = [];

    start() {
        if (this.running) return;
        this.running = true;
        this.interval = setInterval(() => this.maybePushRequest(), GENERATE_INTERVAL_MS);
    }

    stop() {
        this.running = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.buffer = [];
    }

    subscribe(cb: (r: LiveRequest) => void) {
        this.listeners.push(cb);
    }
    unsubscribe(cb: (r: LiveRequest) => void) {
        this.listeners = this.listeners.filter((l) => l !== cb);
    }
    unsubscribeAll() {
        this.listeners = [];
    }

    maybePushRequest() {
        if (!this.running) return;
        if (this.listeners.length === 0) return;

        const req = this.generateRandomRequest();
        this.listeners.forEach((l) => l(req));
        this.buffer.push(req);
        if (this.buffer.length > BATCH_LIMIT) this.buffer.shift();
    }

    generateRandomRequest(): LiveRequest {
        const id = `req_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const serviceTypes = ['plumber', 'electrician', 'ac_repair', 'washing_machine', 'tv_repair'];
        const issueSamples = [
            'Not turning on',
            'Leaking water',
            'Not cooling',
            'Strange noise',
            'Not heating',
        ];
        // Random nearby coordinates (Karachi approx)
        const lat = 24.855 + (Math.random() - 0.5) * 0.12;
        const lng = 67.333 + (Math.random() - 0.5) * 0.12;
        const visitCharges = 300 + Math.floor(Math.random() * 150);

        const now = Date.now();
        return {
            id,
            serviceType: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
            issue: issueSamples[Math.floor(Math.random() * issueSamples.length)],
            customerName: ['Ali', 'Sara', 'Hassan', 'Ayesha'][Math.floor(Math.random() * 4)],
            locationLabel: ['Clifton', 'DHA', 'Gulshan', 'North Nazimabad'][Math.floor(Math.random() * 4)],
            coordinates: { latitude: lat, longitude: lng },
            createdAt: now,
            expiresAt: now + DEFAULT_TTL_MS,
            visitCharges,
            photos: Math.random() > 0.82 ? ['https://placekitten.com/200/200'] : [],
        };
    }
}

export const LiveRequestsGenerator = new LiveRequestsGeneratorClass();
export type { LiveRequest };


// // src/services/liveRequestsService.ts
// // import { LiveRequest } from './types'; // define type below or inline

// // Simple types
// export type Coordinates = { latitude: number; longitude: number; };
// type LiveRequest = {
//     id: string;
//     serviceType: string;
//     issue: string;
//     customerName?: string;
//     locationLabel: string;
//     coordinates: Coordinates;
//     createdAt: number;
//     expiresAt: number;
//     visitCharges?: number;
//     photos?: string[]; // optional
//     // optional metadata
// };

// // Config
// const DEFAULT_TTL_MS = 20 * 1000;
// const GENERATE_INTERVAL_MS = 3000; // try generate every 3s but check batch size
// const BATCH_LIMIT = 50; // prevent memory overgrowth in mock

// class LiveRequestsGeneratorClass {
//     listeners: Array<(r: LiveRequest) => void> = [];
//     running = false;
//     interval: NodeJS.Timeout | null = null;
//     buffer: LiveRequest[] = [];

//     start() {
//         if (this.running) return;
//         this.running = true;
//         this.interval = setInterval(() => this.maybePushRequest(), GENERATE_INTERVAL_MS);
//     }

//     stop() {
//         this.running = false;
//         if (this.interval) {
//             clearInterval(this.interval);
//             this.interval = null;
//         }
//         this.buffer = [];
//     }

//     subscribe(cb: (r: LiveRequest) => void) {
//         this.listeners.push(cb);
//     }
//     unsubscribe(cb: (r: LiveRequest) => void) {
//         this.listeners = this.listeners.filter((l) => l !== cb);
//     }
//     unsubscribeAll() {
//         this.listeners = [];
//     }

//     maybePushRequest() {
//         // throttle if too many in store (consumers should manage)
//         if (!this.running) return;
//         if (this.listeners.length === 0) return;

//         // create random request
//         const req = this.generateRandomRequest();
//         // push to listeners
//         this.listeners.forEach((l) => l(req));
//         // keep small buffer
//         this.buffer.push(req);
//         if (this.buffer.length > BATCH_LIMIT) this.buffer.shift();
//     }

//     generateRandomRequest(): LiveRequest {
//         const id = `req_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
//         const serviceTypes = ['AC Repair', 'Washing Machine', 'Plumbing', 'TV Repair', 'Refrigerator'];
//         const issueSamples = [
//             'Not turning on',
//             'Leaking water',
//             'Not cooling',
//             'Strange noise',
//             'Not heating',
//         ];
//         const lat = 24.8607 + (Math.random() - 0.5) * 0.1;
//         const lng = 67.0011 + (Math.random() - 0.5) * 0.1;
//         const visitCharges = 10 + Math.floor(Math.random() * 40);

//         const now = Date.now();
//         return {
//             id,
//             serviceType: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
//             issue: issueSamples[Math.floor(Math.random() * issueSamples.length)],
//             customerName: ['Ali', 'Sara', 'Hassan', 'Ayesha'][Math.floor(Math.random() * 4)],
//             locationLabel: ['Clifton', 'DHA', 'Gulshan', 'North Nazimabad'][Math.floor(Math.random() * 4)],
//             coordinates: { latitude: lat, longitude: lng },
//             createdAt: now,
//             expiresAt: now + DEFAULT_TTL_MS,
//             visitCharges,
//             photos: Math.random() > 0.8 ? ['https://placekitten.com/200/200'] : [],
//         };
//     }
// }

// export const LiveRequestsGenerator = new LiveRequestsGeneratorClass();
// export type { LiveRequest };
