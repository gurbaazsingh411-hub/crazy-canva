import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only if config is present and app isn't already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Enable offline persistence if in browser
if (typeof window !== "undefined") {
    import("firebase/firestore").then(({ enableIndexedDbPersistence }) => {
        enableIndexedDbPersistence(db).catch((err) => {
            if (err.code === "failed-precondition") {
                console.warn("Firestore persistence failed (multiple tabs open)");
            } else if (err.code === "unimplemented") {
                console.warn("Firestore persistence not supported by browser");
            }
        });
    });
}

// Analytics is only available in the browser
if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
        if (supported) getAnalytics(app);
    });
}

export { db };
