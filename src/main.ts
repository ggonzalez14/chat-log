import './assets/main.css';
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
const root:any = app.mount('#app');

declare global {
    interface Window {
        app:any
    }
}

window.app = root