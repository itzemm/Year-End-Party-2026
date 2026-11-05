"use client";

import { useState } from "react";

const QUESTIONS = [
  {
    q: "What does the bottle Alice finds say on its label?",
    options: ["Eat Me", "Drink Me", "Try Me", "Open Me"],
    answer: 1,
  },
  {
    q: "What is the Queen of Hearts’ favourite command?",
    options: ["Bring me tarts!", "Paint the roses!", "Off with their heads!", "Change places!"],
    answer: 2,
  },
  {
    q: "What is the Caterpillar smoking when Alice meets him?",
    options: ["A pipe", "A hookah", "A cigar", "Nothing at all"],
    answer: 1,
  },
  {
    q: "What does the Mad Hatter’s hat price tag read?",
    options: ["10/6", "12/25", "1/2", "7/7"],
    answer: 0,
  },
  {
    q: "What is used as a mallet in the Queen’s croquet game?",
    options: ["A hedgehog", "A flamingo", "A walrus", "A teaspoon"],
    answer: 1,
  },
  {
    q: "Which creature famously disappears until only its grin remains?",
    options: ["The March Hare", "The Dormouse", "The Cheshire Cat", "The Mock Turtle"],
    answer: 2,
  },
  {
    q: "Who wrote “Alice’s Adventures in Wonderland”?",
    options: ["Lewis Carroll", "Roald Dahl", "J. M. Barrie", "Beatrix Potter"],
    answer: 0,
  },
];

export default function RiddleQuiz() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const done = index >= QUESTIONS.length;

  function choose(i) {
    if (picked !== null) return;
    setPicked(i);
    if (i === QUESTIONS[index].answer) setScore((s) => s + 1);
  }

  function next() {
    setPicked(null);
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setPicked(null);
    setScore(0);
  }

  if (done) {
    const verdict =
      score === QUESTIONS.length
        ? "A true Wonderland native! The Hatter tips his hat to you."
        : score >= QUESTIONS.length / 2
          ? "Curiouser and curiouser — not bad at all!"
          : "You seem to have fallen asleep at the tea party.";
    return (
      <div className="quiz-result">
        <p className="big-emoji" aria-hidden="true">🎩</p>
        <p className="score-line">
          {score} / {QUESTIONS.length}
        </p>
        <p>{verdict}</p>
        <button className="btn primary" onClick={restart}>
          Play again
        </button>
      </div>
    );
  }

  const q = QUESTIONS[index];
  return (
    <div className="quiz">
      <p className="quiz-progress">
        Riddle {index + 1} of {QUESTIONS.length} · Score {score}
      </p>
      <h3 className="quiz-question">{q.q}</h3>
      <div className="quiz-options">
        {q.options.map((opt, i) => {
          const state = picked === null ? "" : i === q.answer ? "correct" : i === picked ? "wrong" : "dim";
          return (
            <button key={opt} className={`quiz-option ${state}`} onClick={() => choose(i)} disabled={picked !== null}>
              <span className="suit" aria-hidden="true">{["♠", "♥", "♣", "♦"][i]}</span> {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <button className="btn primary" onClick={next}>
          {index + 1 === QUESTIONS.length ? "See my verdict" : "Next riddle"}
        </button>
      )}
    </div>
  );
}
