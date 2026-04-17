import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AdminPage } from './pages/AdminPage';
import { ParticipantPage } from './pages/ParticipantPage';
import { Play } from 'lucide-react';

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-12 bg-[var(--color-pastel-bg)] text-center relative overflow-hidden font-sans">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF5F5F] via-[#FFD75F] to-[#BF5FFF] mb-6 sm:mb-8 shadow-lg"></div>
      <h1 className="text-4xl sm:text-6xl text-gray-800 font-extrabold drop-shadow-sm mb-4 sm:mb-6 z-10 break-keep">무지개 단어 놀이터 🌈</h1>
      <p className="text-lg sm:text-2xl text-gray-600 mb-8 sm:mb-12 z-10 max-w-2xl font-bold break-keep px-4">
        AI가 나쁜 말을 예쁘게 걸러주고, 같은 뜻의 친구들을 하나로 모아주는 재미있는 실시간 설문 도구!
      </p>

      <div className="flex gap-6 z-10 w-full sm:w-auto px-4 sm:px-0">
        <Link 
          to="/admin"
          className="bg-white border text-gray-800 text-lg sm:text-xl font-bold px-6 sm:px-10 py-4 sm:py-5 rounded-full hover:bg-gray-50 transition-all flex items-center justify-center w-full sm:w-auto gap-3 shadow-[0_15px_35px_rgba(0,0,0,0.1)] border-white ring-4 ring-white"
        >
          선생님 대시보드로 이동
        </Link>
      </div>

      <div className="mt-12 text-gray-400 z-10 font-bold bg-white/50 px-4 sm:px-6 py-2 rounded-full backdrop-blur-sm text-xs sm:text-base break-keep max-w-[90%]">
        아이들은 이 화면이 아닌, 선생님이 공유해주신 방 주소(URL)로 접속합니다.
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/survey/:id" element={<ParticipantPage />} />
      </Routes>
    </BrowserRouter>
  );
}
