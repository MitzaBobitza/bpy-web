/**
 * Score grades and the colours osu! gives them.
 *
 * bancho.py stores the grade as a short string on the score row ("XH",
 * "X", "SH", "S", "A"..."D", or "F" for a failed play).
 */

export type Grade = "XH" | "X" | "SH" | "S" | "A" | "B" | "C" | "D" | "F" | "N";

export interface GradeStyle {
  /** Text shown in the badge — silver/gold SS and S collapse to one glyph. */
  label: string;
  /** Foreground colour of the glyph. */
  color: string;
  /** Badge background. */
  background: string;
  /** Full name, for tooltips and screen readers. */
  title: string;
}

const SILVER = "linear-gradient(140deg, #e3edf5 0%, #b3c4d4 55%, #8fa3b6 100%)";
const GOLD = "linear-gradient(140deg, #ffe89a 0%, #ffcc22 55%, #e0a300 100%)";

export const GRADE_STYLES: Record<Grade, GradeStyle> = {
  XH: { label: "SS", color: "#3d3226", background: SILVER, title: "Silver SS — perfect accuracy with Hidden or Flashlight" },
  X: { label: "SS", color: "#4a3407", background: GOLD, title: "SS — perfect accuracy" },
  SH: { label: "S", color: "#3d3226", background: SILVER, title: "Silver S — with Hidden or Flashlight" },
  S: { label: "S", color: "#4a3407", background: GOLD, title: "S" },
  A: { label: "A", color: "#12300a", background: "linear-gradient(140deg, #b6f36a 0%, #88da20 100%)", title: "A" },
  B: { label: "B", color: "#0b2237", background: "linear-gradient(140deg, #7cc6ff 0%, #4fa3f7 100%)", title: "B" },
  C: { label: "C", color: "#2e0f2b", background: "linear-gradient(140deg, #e79bf0 0%, #d76dd7 100%)", title: "C" },
  D: { label: "D", color: "#380c0c", background: "linear-gradient(140deg, #ff9090 0%, #ff5a5a 100%)", title: "D" },
  F: { label: "F", color: "#c9bcc3", background: "linear-gradient(140deg, #4b3b43 0%, #372a30 100%)", title: "Failed" },
  N: { label: "–", color: "#c9bcc3", background: "linear-gradient(140deg, #4b3b43 0%, #372a30 100%)", title: "No grade" },
};

export function gradeStyle(grade: string): GradeStyle {
  const key = grade?.toUpperCase() as Grade;
  return GRADE_STYLES[key] ?? GRADE_STYLES.N;
}

/**
 * Submission status of a score (`SubmissionStatus` in bancho.py):
 * 0 failed, 1 submitted, 2 the player's best on that map.
 */
export const SCORE_STATUS: Record<number, string> = {
  0: "Failed",
  1: "Submitted",
  2: "Personal best",
};

export function scoreStatusLabel(status: number): string {
  return SCORE_STATUS[status] ?? "Unknown";
}
