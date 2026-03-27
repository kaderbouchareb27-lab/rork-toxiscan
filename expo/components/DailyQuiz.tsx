import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Brain, CheckCircle, XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { getTodayQuiz } from '@/mocks/scannerContent';
import { useQuiz } from '@/providers/QuizProvider';

export default function DailyQuiz() {
  const quiz = getTodayQuiz();
  const { hasAnsweredToday, submitAnswer, totalCorrect, totalAnswered } = useQuiz();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<boolean>(hasAnsweredToday);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleSelect = useCallback((index: number) => {
    if (revealed || selectedIndex !== null) return;

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSelectedIndex(index);
    const isCorrect = index === quiz.correctIndex;
    submitAnswer(isCorrect);

    setTimeout(() => {
      setRevealed(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      if (Platform.OS !== 'web') {
        if (isCorrect) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    }, 300);
  }, [revealed, selectedIndex, quiz.correctIndex, submitAnswer, fadeAnim]);

  const getOptionStyle = (index: number) => {
    if (!revealed && selectedIndex === null) return styles.option;
    if (!revealed && selectedIndex === index) return [styles.option, styles.optionSelected];

    if (index === quiz.correctIndex) return [styles.option, styles.optionCorrect];
    if (selectedIndex === index && index !== quiz.correctIndex) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDimmed];
  };

  const getOptionTextStyle = (index: number) => {
    if (!revealed && selectedIndex === null) return styles.optionText;
    if (!revealed && selectedIndex === index) return [styles.optionText, styles.optionTextSelected];

    if (index === quiz.correctIndex) return [styles.optionText, styles.optionTextCorrect];
    if (selectedIndex === index && index !== quiz.correctIndex) return [styles.optionText, styles.optionTextWrong];
    return [styles.optionText, styles.optionTextDimmed];
  };

  const alreadyAnswered = hasAnsweredToday && selectedIndex === null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Brain color={Colors.primary} size={16} strokeWidth={2.2} />
        </View>
        <Text style={styles.headerTitle}>Testez vos connaissances</Text>
        {totalAnswered > 0 && (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{totalCorrect}/{totalAnswered}</Text>
          </View>
        )}
      </View>

      <Text style={styles.question}>{quiz.question}</Text>

      {alreadyAnswered ? (
        <View style={styles.answeredContainer}>
          <CheckCircle color={Colors.primary} size={20} />
          <Text style={styles.answeredText}>Vous avez déjà répondu au quiz du jour. Revenez demain !</Text>
        </View>
      ) : (
        <>
          <View style={styles.options}>
            {quiz.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={getOptionStyle(index)}
                onPress={() => handleSelect(index)}
                activeOpacity={0.7}
                disabled={revealed || selectedIndex !== null}
                testID={`quiz-option-${index}`}
              >
                <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
                <Text style={getOptionTextStyle(index)}>{option}</Text>
                {revealed && index === quiz.correctIndex && (
                  <CheckCircle color="#1B7A3D" size={16} />
                )}
                {revealed && selectedIndex === index && index !== quiz.correctIndex && (
                  <XCircle color="#CC2D25" size={16} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {revealed && (
            <Animated.View style={[styles.explanation, { opacity: fadeAnim }]}>
              <View style={styles.explanationHeader}>
                {selectedIndex === quiz.correctIndex ? (
                  <CheckCircle color="#1B7A3D" size={16} />
                ) : (
                  <XCircle color="#CC2D25" size={16} />
                )}
                <Text style={[
                  styles.explanationResultText,
                  { color: selectedIndex === quiz.correctIndex ? '#1B7A3D' : '#CC2D25' }
                ]}>
                  {selectedIndex === quiz.correctIndex ? 'Bonne réponse !' : 'Mauvaise réponse'}
                </Text>
              </View>
              <Text style={styles.explanationText}>{quiz.explanation}</Text>
            </Animated.View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(52, 199, 89, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  scoreBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  question: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 14,
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(52, 199, 89, 0.06)',
  },
  optionCorrect: {
    borderColor: '#34C759',
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
  },
  optionWrong: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
  },
  optionDimmed: {
    opacity: 0.5,
  },
  optionLetter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
    overflow: 'hidden',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  optionTextSelected: {
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  optionTextCorrect: {
    fontWeight: '600' as const,
    color: '#1B7A3D',
  },
  optionTextWrong: {
    color: '#CC2D25',
  },
  optionTextDimmed: {
    color: Colors.textSecondary,
  },
  explanation: {
    marginTop: 14,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  explanationResultText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  explanationText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },
  answeredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    padding: 14,
    borderRadius: 12,
  },
  answeredText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
