// Konfigurasi Utama Trade Intelligent

export const CONFIG = {
    appName: "Trade Intelligent",
    version: "2.0.0",
    
    // Default Trading Parameter
    defaultAsset: "XAUUSD",
    defaultTimeframe: "15min",

    // Helper untuk mengambil atau menyimpan API Key di LocalStorage browser
    getApiKey(keyName) {
        return localStorage.getItem(keyName) || "";
    },

    setApiKey(keyName, keyValue) {
        localStorage.setItem(keyName, keyValue.trim());
    }
};
