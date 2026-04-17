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

  const fetchWords = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('words')
      .select('id, word, count')
      .eq('survey_id', id);

    if (data) {
      setWords(data.map((row) => ({ text: row.word, count: row.count, dbId: row.id })));
    }
  };

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

      await fetchWords(); // Force refresh words
      setWord(''); // Clear input on success
      
      // Play pop sound
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (err: any) {
      setError(err.message || '단어 전송에 실패했어요. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-[var(--color-pastel-bg)] text-[#333]">
      {/* Playful Header */}
      <header className="w-full h-16 sm:h-20 flex items-center justify-between px-4 sm:px-10 box-border bg-white/50 backdrop-blur-md border-b-[2px] border-black/5 z-10 relative">
        <div className="flex items-center gap-2 sm:gap-3 text-lg sm:text-2xl font-extrabold text-gray-800">
           <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#FF5F5F] via-[#FFD75F] to-[#BF5FFF]"></div>
           <span className="truncate max-w-[150px] sm:max-w-none">{surveyTitle}</span>
        </div>
        <div className="bg-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold shadow-[0_4px_10px_rgba(0,0,0,0.05)] border border-[#EEE] whitespace-nowrap">
          {words.length}개의 단어!
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
      <div className="w-full min-h-[160px] sm:min-h-[180px] flex flex-col items-center justify-center gap-5 bg-gradient-to-t from-white/90 to-transparent pb-6 pt-4 sm:pb-8 lg:absolute lg:bottom-0 z-20">
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full px-4">
          <div className="bg-white/80 w-full max-w-[600px] p-2 rounded-full sm:rounded-full rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.1)] flex flex-row items-center border-[3px] border-white relative mdNav items-center">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="좋아하는 단어를 써보세요!"
              disabled={isSubmitting}
              className="flex-1 w-full border-none py-2.5 sm:py-3.5 px-4 sm:px-7 text-base sm:text-xl rounded-full sm:rounded-l-full sm:rounded-r-none outline-none bg-transparent placeholder:text-gray-400 font-sans text-center sm:text-left"
              maxLength={15}
            />
            <button
              type="submit"
              disabled={isSubmitting || !word.trim()}
              className="bg-gradient-to-br from-[#5FBFFF] to-[#5F7FFF] text-white border-none py-2.5 sm:py-3.5 px-5 sm:px-10 rounded-full text-base sm:text-xl font-bold shadow-[0_6px_15px_rgba(95,191,255,0.4)] mr-1 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {isSubmitting ? <Loader2 className="animate-spin w-5 h-5 sm:w-6 sm:h-6 border-transparent" /> : '날려보내기!'}
            </button>
          </div>
          {error && (
            <div className="text-[#FF5F5F] bg-white/90 px-4 sm:px-6 py-2 rounded-full font-bold shadow-sm animate-bounce text-sm sm:text-xl text-center max-w-[90%] break-keep">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
