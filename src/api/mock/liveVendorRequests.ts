// Simulates backend live streaming requests to vendors
export const LiveVendorStream = {
    listeners: [],

    // Start pushing a new request every 20 sec
    start() {
        this.pushNewRequest();
    },

    pushNewRequest() {
        const newRequest = {
            id: `req_${Date.now()}`,
            serviceType: "AC Repair",
            issue: "Unit not cooling properly",
            budget: 50 + Math.floor(Math.random() * 50),
            location: "Business Bay, Dubai",
            timer: 20 // 20 seconds to accept
        };

        // push event to all listeners
        this.listeners.forEach(cb => cb(newRequest));

        // schedule next request after 20 sec
        setTimeout(() => this.pushNewRequest(), 20000);
    },

    subscribe(cb) {
        this.listeners.push(cb);
    },

    unsubscribe(cb) {
        this.listeners = this.listeners.filter(l => l !== cb);
    }
};
