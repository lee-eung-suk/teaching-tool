import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Plus, ExternalLink, RefreshCw, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export function AdminPage() {
  // Dashboard state
  const [surveys, setSurveys] = useState<any[]>([]);
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  const [words, setWords] = useState<any[]>([]);
  const [showQR, setShowQR] = useState(false);

  // Fetch Surveys
  useEffect(() => {
    fetchSurveys();
  }, []);

  // Fetch Words when a survey is selected
  useEffect(() => {
    if (selectedSurvey) {
      fetchWords(selectedSurvey);
    } else {
      setWords([]);
    }
  }, [selectedSurvey]);

  const fetchSurveys = async () => {
    const { data } = await supabase.from('surveys').select('*').order('created_at', { ascending: false });
    if (data) setSurveys(data);
  };

  const fetchWords = async (surveyId: string) => {
    const { data } = await supabase.from('words').select('*').eq('survey_id', surveyId).order('count', { ascending: false });
    if (data) setWords(data);
  };

  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSurveyTitle.trim()) return;

    console.log('Attempting to create survey:', newSurveyTitle);
    const { error } = await supabase.from('surveys').insert([{ title: newSurveyTitle }]);
    
    if (error) {
      console.error('Error creating survey:', error);
      alert(`설문 생성 실패: ${error.message}\nSupabase RLS 정책(INSERT)을 확인해주세요.`);
      return;
    }
    
    console.log('Survey created successfully');
    setNewSurveyTitle('');
    fetchSurveys();
  };

  const handleDeleteSurvey = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까? 데이터(단어)도 함께 삭제됩니다.')) return;
    
    console.log('Attempting to delete survey:', id);
    const { error } = await supabase.from('surveys').delete().eq('id', id);
    
    if (error) {
      console.error('Error deleting survey:', error);
      alert(`설문 삭제 실패: ${error.message}\nSupabase RLS 정책을 확인해주세요.`);
      return;
    }
    
    console.log('Survey deleted successfully');
    if (selectedSurvey === id) setSelectedSurvey(null);
    fetchSurveys();
  };

  const handleDeleteWord = async (id: string, surveyId: string) => {
    console.log('Attempting to delete word:', id);
    const { error } = await supabase.from('words').delete().eq('id', id);
    
    if (error) {
      console.error('Error deleting word:', error);
      alert(`단어 삭제 실패: ${error.message}\nSupabase RLS 정책을 확인해주세요.`);
      return;
    }
    
    console.log('Word deleted successfully');
    fetchWords(surveyId);
  };

  return (
    <div className="min-h-screen font-sans bg-[var(--color-pastel-bg)] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 sm:gap-8">
        
        {/* Sidebar: Survey List */}
        <div className="w-full md:w-1/3 bg-white p-4 sm:p-6 rounded-3xl shadow-sm h-auto md:h-[calc(100vh-4rem)] flex flex-col box-border overflow-x-hidden">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">내 설문 목록</h2>
          </div>
          
          <form onSubmit={handleCreateSurvey} className="flex flex-col sm:flex-row gap-2 mb-6 w-full">
            <input
              type="text"
              value={newSurveyTitle}
              onChange={(e) => setNewSurveyTitle(e.target.value)}
              placeholder="새 방 제목"
              className="w-full sm:flex-1 min-w-0 p-3 rounded-lg border outline-none text-base sm:text-lg focus:border-[#00D084]"
            />
            <button type="submit" className="w-full sm:w-auto bg-[#00D084] py-3 text-white px-4 rounded-lg hover:bg-green-500 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform">
              <Plus />
            </button>
          </form>

          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className={`w-full min-h-[60px] p-4 border rounded-xl flex justify-between items-center transition-colors cursor-pointer ${
                  selectedSurvey === survey.id ? 'border-[#00AEEF] bg-[#eefaff]' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedSurvey(survey.id)}
              >
                <div className="flex-1 pr-4 font-bold text-base sm:text-lg break-words whitespace-normal">{survey.title}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSurvey(survey.id);
                  }}
                  className="shrink-0 text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            {surveys.length === 0 && <p className="text-gray-400 text-center mt-10">생성된 방이 없습니다.</p>}
          </div>
        </div>

        {/* Main Area: Word Management */}
        <div className="w-full md:w-2/3 bg-white p-4 sm:p-6 rounded-3xl shadow-sm h-[500px] md:h-[calc(100vh-4rem)] flex flex-col">
          {selectedSurvey ? (
            <>
              <div className="flex flex-col border-b pb-4 mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold mb-5">단어 관리</h2>
                
                {/* Action Buttons Group */}
                <div className="flex flex-col md:flex-row gap-3 w-full">
                  <Link
                    to={`/survey/${selectedSurvey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full md:w-auto bg-[#EAF8FF] text-[#00AEEF] px-5 py-3.5 rounded-xl transition-all flex items-center justify-center md:justify-start gap-2 text-sm font-bold shadow-sm hover:shadow-md active:scale-95 border border-[#BEE6FF]"
                  >
                    <ExternalLink size={18} />
                    <span>새 탭으로 접속 화면 열기</span>
                  </Link>
                  
                  <button
                    onClick={() => setShowQR(true)}
                    className="w-full md:w-auto bg-[#F3E8FF] text-[#9B51E0] px-5 py-3.5 rounded-xl transition-all flex items-center justify-center md:justify-start gap-2 text-sm font-bold shadow-sm hover:shadow-md active:scale-95 border border-[#E9D5FF]"
                  >
                    <QrCode size={18} />
                    <span>QR코드로 공유하기</span>
                  </button>
                  
                  <button
                    onClick={() => fetchWords(selectedSurvey)}
                    className="w-full md:w-auto bg-gray-50 text-gray-600 px-5 py-3.5 rounded-xl transition-all flex items-center justify-center md:justify-start gap-2 text-sm font-bold shadow-sm hover:shadow-md active:scale-95 border border-gray-200"
                  >
                    <RefreshCw size={18} />
                    <span>새로고침</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {words.length === 0 ? (
                  <div className="text-center text-gray-400 mt-20 text-xl">
                    제출된 단어가 없습니다.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {words.map((w) => (
                      <div key={w.id} className="w-full h-auto min-h-[60px] flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl border">
                        <div className="flex gap-3 flex-1 pr-4 min-w-0 sm:gap-4 items-center">
                          <span className="font-bold text-lg sm:text-xl break-words whitespace-normal">{w.word}</span>
                          <span className="shrink-0 bg-white border rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-bold text-gray-500 shadow-sm">
                            {w.count}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteWord(w.id, selectedSurvey)}
                          className="shrink-0 text-gray-400 hover:text-red-500 p-2 hover:bg-white rounded-full shadow-sm"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4 py-10 px-6 text-center">
              <p className="text-xl sm:text-2xl font-bold leading-relaxed">
                <span className="hidden md:inline">👈 왼쪽에서 설문 방을 선택해주세요!</span>
                <span className="md:hidden">👆 위에서 설문 방을 선택해주세요!</span>
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* QR Code Modal for Sharing */}
      {showQR && selectedSurvey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white p-6 sm:p-10 rounded-3xl flex flex-col items-center gap-4 sm:gap-6 shadow-2xl relative max-w-lg w-full text-center" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl sm:text-3xl font-bold text-gray-800">친구들, 여기로 접속해! 🎈</h2>
            <p className="text-sm sm:text-base text-gray-500">휴대폰 카메라를 열어서 이 QR 코드를 비춰보세요.</p>
            <div className="p-3 sm:p-4 border-4 border-gray-100 rounded-3xl bg-white w-full max-w-[300px] aspect-square flex items-center justify-center">
              <QRCodeSVG 
                value={`${window.location.origin}/survey/${selectedSurvey}`} 
                size={250}
                style={{ width: "100%", height: "100%" }}
                bgColor={"#ffffff"}
                fgColor={"#333333"}
                level={"H"}
                includeMargin={false}
              />
            </div>
            <div className="w-full bg-gray-50 p-3 sm:p-4 rounded-xl break-all font-mono text-xs sm:text-sm border text-gray-600">
              {`${window.location.origin}/survey/${selectedSurvey}`}
            </div>
            <button 
              onClick={() => setShowQR(false)}
              className="mt-2 sm:mt-4 bg-[#FF5F5F] text-white px-8 py-3 rounded-full font-bold text-lg sm:text-xl hover:bg-red-500 shadow-md transition-all active:scale-95 w-full sm:w-auto"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
