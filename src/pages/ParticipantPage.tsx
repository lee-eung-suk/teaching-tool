import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { WordCloud } from '../components/WordCloud';
import { Send, Loader2 } from 'lucide-react';

export function ParticipantPage() {
  const { id } = useParams();
  const [word, setWord] = useState('');
  const [words, setWords] = useState<{ text: string; count: number; dbId: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [surveyTitle, setSurveyTitle] = useState('즐거운 단어 구름 만들기!');

  // Setup Realtime & Fetch Initial Data
  useEffect(() => {
    if (!id) return;

    // Fetch Title
    supabase
      .from('surveys')
      .select('title')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) setSurveyTitle(data.title);
      });

    const fetchWords = async () => {
      const { data, error } = await supabase
        .from('words')
        .select('id, word, count')
        .eq('survey_id', id);

      if (data) {
        setWords(data.map((row) => ({ text: row.word, count: row.count, dbId: row.id })));
      }
    };

    fetchWords();

    // Setup Supabase Realtime
    const channel = supabase
      .channel(`word-changes-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'words',
          filter: `survey_id=eq.${id}`,
        },
        (payload) => {
          fetchWords(); // Simple refetch on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !id) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      // 1. Process via Gemini API (Backend)
      const processRes = await fetch('/api/process-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.trim() }),
      });
      
      const processData = await processRes.json();

      if (!processRes.ok) {
        throw new Error(processData.error || '처리 중 오류가 발생했어요!');
      }

      if (!processData.valid) {
        setError(processData.reason || '사용할 수 없는 단어입니다.');
        setIsSubmitting(false);
        return;
      }

      const normalizedWord = processData.word;

      // 2. Insert or Update in Supabase
      // Try to find if word exists
      const existing = words.find((w) => w.text === normalizedWord);
      if (existing) {
        await supabase
          .from('words')
          .update({ count: existing.count + 1 })
          .eq('id', existing.dbId);
      } else {
        await supabase
          .from('words')
          .insert([{ survey_id: id, word: normalizedWord, count: 1 }]);
      }

      setWord(''); // Clear input on success
    } catch (err: any) {
      setError(err.message || '단어 전송에 실패했어요. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-[var(--color-pastel-bg)] text-[#333]">
      {/* Playful Header */}
      <header className="w-full h-20 flex items-center justify-between px-10 box-border bg-white/50 backdrop-blur-md border-b-[2px] border-black/5 z-10 relative">
        <div className="flex items-center gap-3 text-2xl font-extrabold text-gray-800">
           <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5F5F] via-[#FFD75F] to-[#BF5FFF]"></div>
           <span>{surveyTitle}</span>
        </div>
        <div className="bg-white px-5 py-2 rounded-full text-sm font-semibold shadow-[0_4px_10px_rgba(0,0,0,0.05)] border border-[#EEE]">
          {words.length}개의 단어가 날아다녀요!
        </div>
      </header>

      {/* Cloud Display */}
      <main className="flex-1 w-full relative flex flex-col items-center justify-center overflow-hidden z-10">
        <div className="absolute inset-0 p-10 flex flex-col">
          {words.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-2xl fade-in font-bold opacity-50">
              단어를 가장 먼저 넣어보세요!
            </div>
          ) : (
            <WordCloud words={words} />
          )}
        </div>
      </main>

      {/* Input Form Section */}
      <div className="w-full min-h-[180px] flex flex-col items-center justify-center gap-5 bg-gradient-to-t from-white/80 to-transparent pb-8 z-20">
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
          <div className="bg-white max-w-[600px] w-[90vw] p-2.5 rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.1)] flex items-center border-[3px] border-white relative">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="여기에 좋아하는 단어를 써보세요!"
              disabled={isSubmitting}
              className="flex-1 border-none py-3.5 px-7 text-xl rounded-full outline-none bg-transparent placeholder:text-gray-400 font-sans"
              maxLength={15}
            />
            <button
              type="submit"
              disabled={isSubmitting || !word.trim()}
              className="bg-gradient-to-br from-[#5FBFFF] to-[#5F7FFF] text-white border-none py-3.5 px-10 rounded-full text-xl font-bold shadow-[0_6px_15px_rgba(95,191,255,0.4)] mr-1 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin w-6 h-6 border-transparent" /> : '날려보내기!'}
            </button>
          </div>
          {error && (
            <div className="text-[#FF5F5F] bg-white/80 px-6 py-2 rounded-full font-bold shadow-sm animate-bounce text-xl">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
