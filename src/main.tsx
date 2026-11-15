import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPWACacheCleanUpdater } from './utils/pwaUpdateAndIcon';

initPWACacheCleanUpdater();

createRoot(document.getElementById('root')!).render(<App />);
