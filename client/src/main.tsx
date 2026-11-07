import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './auth';
// A témafájlok importja: a sorrend fontos, mert a reszponzív és animációs
// szabályoknak a többi stílus után kell betöltődniük.
import './styles/base.css';
import './styles/layout.css';
import './styles/buttons.css';
import './styles/forms.css';
import './styles/feedback.css';
import './styles/auth.css';
import './styles/maps.css';
import './styles/play.css';
import './styles/profile.css';
import './styles/editor.css';
import './styles/utilities.css';
import './styles/animations.css';
import './styles/responsive.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Hiányzó #root elem.');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
