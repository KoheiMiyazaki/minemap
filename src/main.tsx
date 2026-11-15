import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {
  initPWACacheCleanUpdater,
  injectOnMemoryAppleTouchIcon,
} from './utils/pwaUpdateAndIcon';

initPWACacheCleanUpdater();
injectOnMemoryAppleTouchIcon();

createRoot(document.getElementById('root')!).render(<App />);
