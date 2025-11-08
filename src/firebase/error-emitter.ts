
import { EventEmitter } from 'events';

// This is a global event emitter for the entire app.
// It's used here to centralize reporting of Firestore permission errors.
// A listener in the root layout will catch these and display a developer overlay.
export const errorEmitter = new EventEmitter();
