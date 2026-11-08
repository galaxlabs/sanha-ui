const URDU_RUN = /([\u0600-\u06FF][\u0600-\u06FF\s\u200c\u200d.,،؟!:()\-–—]*)/g;

export default function Bilingual({ text }) {
  if (typeof text !== 'string') return text ?? null;
  return text.split(URDU_RUN).map((part, i) => (
    i % 2 === 1
      ? <span key={i} lang="ur" dir="rtl" className="urdu">{part}</span>
      : <span key={i}>{part}</span>
  ));
}
