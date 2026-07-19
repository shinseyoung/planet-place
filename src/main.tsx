import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LandingPage from './pages/LandingPage';
import './index.css';

// MVP 단계의 오버엔지니어링(라우터 라이브러리)을 피하고, 
// 상태(State)만으로 빠르고 직관적인 페이지 전환을 구현합니다.
function Root() {
  const [currentView, setCurrentView] = useState<'landing' | 'app'>('landing');

  return (
    <React.StrictMode>
      {currentView === 'landing' ? (
        // 랜딩 페이지에서 onLogin 함수가 호출되면 뷰를 'app'으로 변경합니다.
        <LandingPage onLogin={() => setCurrentView('app')} />
      ) : (
        <App />
      )}
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);