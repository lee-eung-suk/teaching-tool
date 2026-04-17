import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Plus, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Dashboard state
  const [surveys, setSurveys] = useState<any[]>([]);
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  const [words, setWords] = useState<any[]>([]);

  // Auth checking
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Surveys
  useEffect(() => {
    if (user) {
      fetchSurveys();
    }
  }, [user]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("로그인 실패: " + error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSurveyTitle.trim()) return;

    await supabase.from('surveys').insert([{ title: newSurveyTitle, user_id: user.id }]);
    setNewSurveyTitle('');
    fetchSurveys();
  };

  const handleDeleteSurvey = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까? 데이터(단어)도 함께 삭제됩니다.')) return;
    await supabase.from('surveys').delete().eq('id', id);
    if (selectedSurvey === id) setSelectedSurvey(null);
    fetchSurveys();
  };

  const handleDeleteWord = async (id: string, surveyId: string) => {
    await supabase.from('words').delete().eq('id', id);
    fetchWords(surveyId);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white text-gray-800">
        <form onSubmit={handleLogin} className="p-8 bg-gray-50 rounded-3xl shadow-md flex flex-col gap-4 w-96 font-sans">
          <h2 className="text-2xl font-bold mb-4 text-center">관리자 로그인</h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="p-3 rounded-lg border focus:border-[#00D084] outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="p-3 rounded-lg border focus:border-[#00D084] outline-none"
          />
          <button type="submit" className="bg-[#00AEEF] text-white p-3 rounded-lg font-bold hover:bg-[#009bda]">
            로그인
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans bg-[var(--color-pastel-bg)] p-8">
      <div className="max-w-6xl mx-auto flex gap-8">
        
        {/* Sidebar: Survey List */}
        <div className="w-1/3 bg-white p-6 rounded-3xl shadow-sm h-[calc(100vh-4rem)] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">내 설문 목록</h2>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 px-3 py-1 bg-gray-100 rounded-full">
              로그아웃
            </button>
          </div>
          
          <form onSubmit={handleCreateSurvey} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newSurveyTitle}
              onChange={(e) => setNewSurveyTitle(e.target.value)}
              placeholder="새 방 제목"
              className="flex-1 p-3 rounded-lg border outline-none text-lg"
            />
            <button type="submit" className="bg-[#00D084] text-white px-4 rounded-lg hover:bg-green-500 flex items-center justify-center">
              <Plus />
            </button>
          </form>

          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className={`p-4 border rounded-xl flex justify-between items-center transition-colors cursor-pointer ${
                  selectedSurvey === survey.id ? 'border-[#00AEEF] bg-[#eefaff]' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedSurvey(survey.id)}
              >
                <div className="truncate pr-2 font-bold text-lg">{survey.title}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSurvey(survey.id);
                  }}
                  className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            {surveys.length === 0 && <p className="text-gray-400 text-center mt-10">생성된 방이 없습니다.</p>}
          </div>
        </div>

        {/* Main Area: Word Management */}
        <div className="w-2/3 bg-white p-6 rounded-3xl shadow-sm h-[calc(100vh-4rem)] flex flex-col">
          {selectedSurvey ? (
            <>
              <div className="flex justify-between items-end border-b pb-4 mb-4">
                <div>
                  <h2 className="text-3xl font-bold flex items-center gap-3">
                    단어 관리
                    <Link
                      to={`/survey/${selectedSurvey}`}
                      target="_blank"
                      className="text-[#00AEEF] hover:bg-[#eaf8ff] p-2 rounded-full transition-colors flex items-center gap-2 text-sm font-normal"
                    >
                      <ExternalLink size={18} /> 새 탭으로 접속 화면 열기
                    </Link>
                  </h2>
                </div>
                <button
                  onClick={() => fetchWords(selectedSurvey)}
                  className="text-gray-500 flex items-center gap-1 hover:text-gray-800"
                >
                  <RefreshCw size={18} />
                  새로고침
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {words.length === 0 ? (
                  <div className="text-center text-gray-400 mt-20 text-xl">
                    제출된 단어가 없습니다.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {words.map((w) => (
                      <div key={w.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                        <div className="flex gap-4 items-center">
                          <span className="font-bold text-xl">{w.word}</span>
                          <span className="bg-white border rounded-full px-3 py-1 text-sm font-bold text-gray-500 shadow-sm">
                            {w.count}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteWord(w.id, selectedSurvey)}
                          className="text-gray-400 hover:text-red-500 p-2 hover:bg-white rounded-full shadow-sm"
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
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
              <p className="text-2xl">왼쪽에서 설문 방을 선택해주세요!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
