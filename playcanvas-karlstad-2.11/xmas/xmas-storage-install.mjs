// Ska vara den första importen i app.js: modulerna utvärderas i importordning, så skyddet ligger på plats innan någon annan modul läser lagringen.
import {installNamespacedStorage} from './xmas-storage.mjs?v=2.21.1-xmas.2';
export const XMAS_STORAGE_INSTALLED=installNamespacedStorage();
