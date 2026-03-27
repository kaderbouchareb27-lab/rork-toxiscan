import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CheckCircle, XCircle, RotateCcw, Brain, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { QUIZ_QUESTIONS } from '@/mocks/scannerContent';
import { useQuiz } from '@/providers/QuizProvider';

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getQuizQuestions() {
  const shuffled = shuffleArray(QUIZ_QUESTIONS);
  return shuffled.slice(0, 10);
}

export default function QuizScreen() {
  const { submitAnswer } = useQuiz();
  const [questions] = useState(() => getQuizQuestions());
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [finished, setFinished] = useState<boolean>(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const resultFade = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(0)).current;

  const currentQuestion = questions[currentIndex];
  const progress = (currentIndex + 1) / questions.length;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const handleSelect = useCallback((index: number) => {
    if (revealed || selectedIndex !== null) return;

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSelectedIndex(index);
    const isCorrect = index === currentQuestion.correctIndex;

    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    setAnswers(prev => [...prev, isCorrect]);
    submitAnswer(isCorrect);

    setTimeout(() => {
      setRevealed(true);
      Animated.timing(resultFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (Platform.OS !== 'web') {
        if (isCorrect) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    }, 200);
  }, [revealed, selectedIndex, currentQuestion, submitAnswer, resultFade]);

  const handleNext = useCallback(() => {
    if (currentIndex >= questions.length - 1) {
      setFinished(true);
      Animated.spring(scoreScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start();
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(prev => prev + 1);
      setSelectedIndex(null);
      setRevealed(false);
      resultFade.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [currentIndex, questions.length, fadeAnim, resultFade, scoreScale]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setSelectedIndex(null);
    setRevealed(false);
    setScore(0);
    setFinished(false);
    setAnswers([]);
    fadeAnim.setValue(1);
    resultFade.setValue(0);
    progressAnim.setValue(0);
    scoreScale.setValue(0);
  }, [fadeAnim, resultFade, progressAnim, scoreScale]);

  const getOptionStyle = (index: number) => {
    if (!revealed && selectedIndex === null) return styles.option;
    if (!revealed && selectedIndex === index) return [styles.option, styles.optionSelected];
    if (index === currentQuestion.correctIndex) return [styles.option, styles.optionCorrect];
    if (selectedIndex === index && index !== currentQuestion.correctIndex) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDimmed];
  };

  const getScoreColor = () => {
    const pct = score / questions.length;
    if (pct >= 0.8) return Colors.primary;
    if (pct >= 0.5) return '#FF9500';
    return '#FF3B30';
  };

  const getScoreMessage = () => {
    const pct = score / questions.length;
    if (pct === 1) return 'Parfait ! Vous êtes un expert en santé !';
    if (pct >= 0.8) return 'Excellent ! Vous en savez beaucoup !';
    if (pct >= 0.6) return 'Bien joué ! Continuez à apprendre.';
    if (pct >= 0.4) return 'Pas mal ! Il y a encore à découvrir.';
    return 'Continuez à vous informer avec ToxiScan !';
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (finished) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X color={Colors.text} size={22} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.resultScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.resultContainer, { transform: [{ scale: scoreScale }] }]}>
            <View style={[styles.scoreBigCircle, { borderColor: getScoreColor() }]}>
              <Text style={[styles.scoreBigNumber, { color: getScoreColor() }]}>{score}</Text>
              <Text style={styles.scoreBigDenom}>/ {questions.length}</Text>
            </View>
            <Text style={styles.scoreMessage}>{getScoreMessage()}</Text>

            <View style={styles.answersGrid}>
              {answers.map((correct, i) => (
                <View
                  key={i}
                  style={[
                    styles.answerDot,
                    { backgroundColor: correct ? Colors.primary : '#FF3B30' },
                  ]}
                >
                  {correct ? (
                    <CheckCircle color="#fff" size={12} />
                  ) : (
                    <XCircle color="#fff" size={12} />
                  )}
                </View>
              ))}
            </View>
          </Animated.View>

          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.restartButton}
              onPress={handleRestart}
              activeOpacity={0.8}
            >
              <RotateCcw color={Colors.primary} size={18} />
              <Text style={styles.restartButtonText}>Rejouer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X color={Colors.text} size={22} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Brain color={Colors.primary} size={18} />
          <Text style={styles.headerTitle}>Quiz Santé</Text>
        </View>
        <Text style={styles.questionCounter}>{currentIndex + 1}/{questions.length}</Text>
      </View>

      <View style={styles.progressBarContainer}>
        <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.questionScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.questionSection, { opacity: fadeAnim }]}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>

          <View style={styles.optionsList}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={getOptionStyle(index)}
                onPress={() => handleSelect(index)}
                activeOpacity={0.7}
                disabled={revealed || selectedIndex !== null}
                testID={`quiz-option-${index}`}
              >
                <View style={styles.optionLetterContainer}>
                  <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
                </View>
                <Text style={styles.optionText}>{option}</Text>
                {revealed && index === currentQuestion.correctIndex && (
                  <CheckCircle color="#1B7A3D" size={18} />
                )}
                {revealed && selectedIndex === index && index !== currentQuestion.correctIndex && (
                  <XCircle color="#CC2D25" size={18} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {revealed && (
            <Animated.View style={[styles.explanationCard, { opacity: resultFade }]}>
              <View style={styles.explanationHeader}>
                {selectedIndex === currentQuestion.correctIndex ? (
                  <View style={styles.explanationBadgeCorrect}>
                    <CheckCircle color="#fff" size={14} />
                    <Text style={styles.explanationBadgeText}>Bonne réponse</Text>
                  </View>
                ) : (
                  <View style={styles.explanationBadgeWrong}>
                    <XCircle color="#fff" size={14} />
                    <Text style={styles.explanationBadgeText}>Mauvaise réponse</Text>
                  </View>
                )}
              </View>
              <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>

      {revealed && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex >= questions.length - 1 ? 'Voir le résultat' : 'Question suivante'}
            </Text>
            <ChevronRight color="#fff" size={18} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  questionCounter: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#F0F0F5',
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  questionScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 120,
  },
  questionSection: {
    gap: 24,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  optionsList: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EDEDF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(52, 199, 89, 0.04)',
  },
  optionCorrect: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(52, 199, 89, 0.06)',
  },
  optionWrong: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.04)',
  },
  optionDimmed: {
    opacity: 0.45,
  },
  optionLetterContainer: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLetter: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 21,
  },
  explanationCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  explanationHeader: {
    marginBottom: 10,
  },
  explanationBadgeCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  explanationBadgeWrong: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  explanationBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  explanationText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#EDEDF0',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  resultScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  resultContainer: {
    alignItems: 'center',
    gap: 20,
  },
  scoreBigCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  scoreBigNumber: {
    fontSize: 48,
    fontWeight: '800' as const,
    letterSpacing: -2,
  },
  scoreBigDenom: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginTop: -4,
  },
  scoreMessage: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  answersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  answerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultActions: {
    gap: 10,
    marginTop: 36,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  restartButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  backButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
});
