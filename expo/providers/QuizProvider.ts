import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const QUIZ_SCORE_KEY = 'toxiscan_quiz_score';
const QUIZ_ANSWERED_KEY = 'toxiscan_quiz_answered';

interface QuizState {
  totalCorrect: number;
  totalAnswered: number;
  answeredToday: string | null;
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const [QuizProvider, useQuiz] = createContextHook(() => {
  const [quizState, setQuizState] = useState<QuizState>({
    totalCorrect: 0,
    totalAnswered: 0,
    answeredToday: null,
  });

  const quizQuery = useQuery({
    queryKey: ['quizScore'],
    queryFn: async () => {
      const scoreStr = await AsyncStorage.getItem(QUIZ_SCORE_KEY);
      const answeredStr = await AsyncStorage.getItem(QUIZ_ANSWERED_KEY);
      const score = scoreStr ? (JSON.parse(scoreStr) as { totalCorrect: number; totalAnswered: number }) : { totalCorrect: 0, totalAnswered: 0 };
      return {
        ...score,
        answeredToday: answeredStr ?? null,
      };
    },
  });

  useEffect(() => {
    if (quizQuery.data) {
      setQuizState(quizQuery.data);
    }
  }, [quizQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (state: QuizState) => {
      await AsyncStorage.setItem(QUIZ_SCORE_KEY, JSON.stringify({
        totalCorrect: state.totalCorrect,
        totalAnswered: state.totalAnswered,
      }));
      if (state.answeredToday) {
        await AsyncStorage.setItem(QUIZ_ANSWERED_KEY, state.answeredToday);
      }
      return state;
    },
  });

  const hasAnsweredToday = useMemo(() => {
    return quizState.answeredToday === getTodayString();
  }, [quizState.answeredToday]);

  const submitAnswer = useCallback((isCorrect: boolean) => {
    const updated: QuizState = {
      totalCorrect: quizState.totalCorrect + (isCorrect ? 1 : 0),
      totalAnswered: quizState.totalAnswered + 1,
      answeredToday: getTodayString(),
    };
    setQuizState(updated);
    saveMutation.mutate(updated);
    console.log('[Quiz] Answer submitted, correct:', isCorrect, 'total:', updated.totalCorrect, '/', updated.totalAnswered);
  }, [quizState, saveMutation]);

  return useMemo(() => ({
    totalCorrect: quizState.totalCorrect,
    totalAnswered: quizState.totalAnswered,
    hasAnsweredToday,
    submitAnswer,
    isLoading: quizQuery.isLoading,
  }), [quizState.totalCorrect, quizState.totalAnswered, hasAnsweredToday, submitAnswer, quizQuery.isLoading]);
});
