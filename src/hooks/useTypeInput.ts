import { useEffect, useRef, useState } from 'react'

type Phase = 'input' | 'result'

interface UseTypeInputReturn {
  phase: Phase
  isCorrect: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  commit: (correct: boolean) => void
  advance: () => void
}

/**
 * Shared stateful logic for type-input study cards.
 * Manages input/result phase transitions and focus restoration.
 *
 * Flow: input → commit(correct) → result → advance() → onAnswer(correct)
 * Skip: commit(false) in input phase to reveal the answer, then Enter to advance.
 */
export function useTypeInput(
  onAnswer: (correct: boolean) => void,
  resetKey: string,
): UseTypeInputReturn {
  const [phase, setPhase] = useState<Phase>('input')
  const [isCorrect, setIsCorrect] = useState(false)
  const isCorrectRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setPhase('input')
    // eslint-disable-next-line react/set-state-in-effect
    setIsCorrect(false)
    isCorrectRef.current = false
    inputRef.current?.focus()
  }, [resetKey])

  function commit(correct: boolean) {
    isCorrectRef.current = correct
    setIsCorrect(correct)
    setPhase('result')
  }

  function advance() {
    onAnswer(isCorrectRef.current)
  }

  return { phase, isCorrect, inputRef, commit, advance }
}
