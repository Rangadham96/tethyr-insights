import jsPDF from "jspdf";
import type { ReportData } from "@/types/report";
import { SOURCE_REGISTRY } from "@/constants/sources";

// ═══════════════════════════════════════════════
// Tethyr PDF Export — matches parchment design system
// ═══════════════════════════════════════════════

// Colors (from index.css HSL → RGB)
const C = {
  paper: [244, 239, 230] as [number, number, number],       // #F4EFE6
  ink: [28, 25, 23] as [number, number, number],             // #1C1917
  ink2: [61, 56, 48] as [number, number, number],            // #3D3830
  ink3: [107, 99, 88] as [number, number, number],           // #6B6358
  ink4: [156, 148, 137] as [number, number, number],         // #9C9489
  red: [139, 31, 31] as [number, number, number],            // #8B1F1F
  green: [26, 92, 58] as [number, number, number],           // #1A5C3A
  amber: [160, 114, 42] as [number, number, number],         // #A0722A
  rule: [220, 214, 206] as [number, number, number],         // approx ink @ 10%
};

const VERDICT_COLOR: Record<string, [number, number, number]> = {
  CONFIRMED: C.green,
  PARTIAL: C.amber,
  UNCLEAR: C.red,
  INVALIDATED: C.red,
};

const VERDICT_ICON: Record<string, string> = {
  CONFIRMED: "↑",
  PARTIAL: "↔",
  UNCLEAR: "?",
  INVALIDATED: "↓",
};

// Page geometry (A4) — editorial asymmetric margins
const PW = 210;  // page width mm
const PH = 297;  // page height mm
const ML = 22;   // margin left (wider for editorial feel)
const MR = 18;   // margin right
const MT = 22;   // margin top
const MB = 20;   // margin bottom
const CW = PW - ML - MR; // content width = 170mm

// Line-height multipliers matched to font sizes
const LH = {
  pt16: 6.5,   // 16pt display
  pt14: 5.5,   // 14pt section title
  pt10: 4.2,   // 10pt body
  pt9_5: 4.0,  // 9.5pt body
  pt9: 3.8,    // 9pt body
  pt8_5: 3.6,  // 8.5pt body
  pt7: 3.0,    // 7pt mono
  pt6_5: 2.8,  // 6.5pt mono
  pt6: 2.6,    // 6pt mono
};

export function exportReportPdf(report: ReportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MT;

  // ── Helpers ──

  function setFont(style: "display" | "body" | "mono", weight: "normal" | "bold" | "italic" = "normal") {
    if (style === "mono") {
      doc.setFont("courier", weight === "bold" ? "bold" : weight === "italic" ? "oblique" : "normal");
    } else if (style === "display") {
      doc.setFont("times", weight === "bold" ? "bold" : weight === "italic" ? "italic" : "normal");
    } else {
      doc.setFont("times", weight === "bold" ? "bold" : weight === "italic" ? "italic" : "normal");
    }
  }

  function color(c: [number, number, number]) {
    doc.setTextColor(c[0], c[1], c[2]);
  }

  function drawColor(c: [number, number, number]) {
    doc.setDrawColor(c[0], c[1], c[2]);
  }

  function fillColor(c: [number, number, number]) {
    doc.setFillColor(c[0], c[1], c[2]);
  }

  function checkPage(needed: number) {
    if (y + needed > PH - MB) {
      doc.addPage();
      fillColor(C.paper);
      doc.rect(0, 0, PW, PH, "F");
      y = MT;
    }
  }

  function splitText(text: string, maxWidth: number): string[] {
    return doc.splitTextToSize(text, maxWidth);
  }

  function drawRule(x1: number, x2: number, yPos: number, strong = false) {
    drawColor(strong ? C.ink : C.rule);
    doc.setLineWidth(strong ? 0.4 : 0.15);
    doc.line(x1, yPos, x2, yPos);
  }

  function sectionNumber(num: string) {
    checkPage(12);
    setFont("mono");
    doc.setFontSize(7);
    color(C.ink4);
    doc.text(num, ML, y);
    drawRule(ML + 8, ML + CW, y - 0.5);
    y += 6;
  }

  function sectionTitle(text: string) {
    checkPage(10);
    setFont("display", "bold");
    doc.setFontSize(14);
    color(C.ink);
    const lines = splitText(text, CW);
    doc.text(lines, ML, y);
    y += lines.length * LH.pt14 + 3;
  }

  // ── Paper background on first page ──
  fillColor(C.paper);
  doc.rect(0, 0, PW, PH, "F");

  // ── Top bar ──
  setFont("mono");
  doc.setFontSize(6.5);
  color(C.ink4);
  doc.text(`REPORT #${report.meta.report_id}`, ML, y);

  const sourcesStr = report.meta.sources_used
    .map((s) => SOURCE_REGISTRY[s.platform]?.display_name || s.display_name)
    .join(", ");
  doc.text(`${report.meta.data_points} data points`, ML + CW, y, { align: "right" });
  y += 3;
  doc.text(`Searched: ${sourcesStr}`, ML, y);

  const vc = VERDICT_COLOR[report.meta.verdict] || C.ink;
  color(vc);
  doc.text(`${VERDICT_ICON[report.meta.verdict] || ""} ${report.meta.verdict}`, ML + CW, y, { align: "right" });
  y += 3;
  drawRule(ML, ML + CW, y, true);
  y += 8;

  // ── Query ──
  setFont("mono");
  doc.setFontSize(6.5);
  color(C.ink4);
  doc.text("INTELLIGENCE REPORT FOR", ML, y);
  y += 5;

  setFont("display", "italic");
  doc.setFontSize(16);
  color(C.ink);
  const queryLines = splitText(`"${report.meta.query}"`, CW);
  doc.text(queryLines, ML, y);
  y += queryLines.length * LH.pt16 + 4;

  drawRule(ML, ML + CW, y);
  y += 8;

  // ═══ 01 — Problem Validation ═══
  sectionNumber("01");
  sectionTitle("Problem Validation");

  // Verdict block — dynamically sized
  if (report.meta.verdict_statement) {
    const verdictC = VERDICT_COLOR[report.meta.verdict] || C.ink;
    setFont("body", "bold");
    doc.setFontSize(10);
    const verdictLines = splitText(report.meta.verdict_statement, CW - 8);
    const blockH = Math.max(verdictLines.length * LH.pt10 + 6, 10);
    checkPage(blockH + 5);

    // Left accent bar
    fillColor(verdictC);
    doc.rect(ML, y - 1, 1.2, blockH, "F");
    // Light tinted background
    const tint: [number, number, number] = [
      Math.round(C.paper[0] * 0.92 + verdictC[0] * 0.08),
      Math.round(C.paper[1] * 0.92 + verdictC[1] * 0.08),
      Math.round(C.paper[2] * 0.92 + verdictC[2] * 0.08),
    ];
    fillColor(tint);
    doc.rect(ML + 1.2, y - 1, CW - 1.2, blockH, "F");

    color(verdictC);
    doc.text(verdictLines, ML + 4, y + 3);
    y += blockH + 5;
  }

  // Quotes — compact source label, more room for quote text
  const QUOTE_LABEL_W = 18; // mm for source label
  const QUOTE_START = ML + QUOTE_LABEL_W + 2; // quote text starts here
  const QUOTE_W = CW - QUOTE_LABEL_W - 2; // available quote width

  for (const q of report.problem_validation.quotes) {
    const quoteLines = splitText(`"${q.text}"`, QUOTE_W);
    checkPage(quoteLines.length * LH.pt10 + 6);

    setFont("mono");
    doc.setFontSize(6);
    color(C.ink4);
    const srcLabel = q.source || "";
    const platLabel = SOURCE_REGISTRY[q.platform]?.display_name || q.platform;
    // Source labels right-aligned within the label column
    doc.text(srcLabel, ML + QUOTE_LABEL_W, y, { align: "right" });
    doc.text(platLabel, ML + QUOTE_LABEL_W, y + 3, { align: "right" });

    // vertical rule
    drawColor(C.rule);
    doc.setLineWidth(0.15);
    doc.line(QUOTE_START - 1, y - 1, QUOTE_START - 1, y + quoteLines.length * LH.pt10 + 1);

    setFont("body", "italic");
    doc.setFontSize(10);
    color(C.ink2);
    doc.text(quoteLines, QUOTE_START, y);
    y += quoteLines.length * LH.pt10 + 5;
  }

  drawRule(ML, ML + CW, y);
  y += 8;

  // ═══ 02 — Feature Gaps ═══
  sectionNumber("02");
  sectionTitle("What people actually want — ranked by frequency");

  // Proportional columns: # 10%, GAP 55%, FREQ 15%, STATUS 20%
  const gapCol = {
    num: ML,
    gap: ML + CW * 0.08,
    freq: ML + CW * 0.65,
    status: ML + CW * 0.80,
  };
  const gapTextW = CW * 0.55; // width for gap description

  // Table header
  checkPage(8);
  setFont("mono");
  doc.setFontSize(6);
  color(C.ink3);
  doc.text("#", gapCol.num, y);
  doc.text("GAP", gapCol.gap, y);
  doc.text("FREQ", gapCol.freq, y);
  doc.text("STATUS", gapCol.status, y);
  y += 2;
  drawRule(ML, ML + CW, y, true);
  y += 4;

  for (let i = 0; i < report.feature_gaps.gaps.length; i++) {
    const g = report.feature_gaps.gaps[i];
    const gapText = `${g.title}: ${g.description}`;
    const gapLines = splitText(gapText, gapTextW);
    checkPage(gapLines.length * LH.pt9 + 4);

    setFont("mono");
    doc.setFontSize(6.5);
    color(C.ink4);
    doc.text(String(i + 1).padStart(2, "0"), gapCol.num, y);

    setFont("body");
    doc.setFontSize(9);
    color(C.ink2);
    doc.text(gapLines, gapCol.gap, y);

    setFont("mono");
    doc.setFontSize(6.5);
    color(C.ink4);
    doc.text(g.frequency, gapCol.freq, y);

    color(g.status === "Unaddressed" ? C.red : C.ink4);
    doc.text(g.status.toUpperCase(), gapCol.status, y);

    y += gapLines.length * LH.pt9 + 3;
    if (i < report.feature_gaps.gaps.length - 1) {
      drawRule(gapCol.gap, ML + CW, y - 1);
    }
  }

  drawRule(ML, ML + CW, y + 1);
  y += 9;

  // ═══ 03 — Competitor Weaknesses ═══
  sectionNumber("03");
  sectionTitle("Competitor weaknesses — from their users' own words");

  // Weighted columns: 20% / 25% / 30% / 25%
  const compCol = {
    name: ML,
    pros: ML + CW * 0.20,
    cons: ML + CW * 0.45,
    opp: ML + CW * 0.75,
  };
  const compW = {
    name: CW * 0.18,
    pros: CW * 0.23,
    cons: CW * 0.28,
    opp: CW * 0.23,
  };

  // Table header
  checkPage(8);
  setFont("mono");
  doc.setFontSize(6);
  color(C.ink3);
  doc.text("COMPETITOR", compCol.name, y);
  doc.text("WHAT USERS VALUE", compCol.pros, y);
  doc.text("WHAT USERS HATE", compCol.cons, y);
  doc.text("YOUR OPENING", compCol.opp, y);
  y += 2;
  drawRule(ML, ML + CW, y, true);
  y += 4;

  for (let i = 0; i < report.competitor_weaknesses.competitors.length; i++) {
    const c = report.competitor_weaknesses.competitors[i];
    const prosText = c.pros.join(". ");
    const consText = c.cons.join(". ");

    const nameLines = splitText(c.name, compW.name);
    const prosLines = splitText(prosText, compW.pros);
    const consLines = splitText(consText, compW.cons);
    const oppLines = splitText(c.opportunity, compW.opp);
    const maxLines = Math.max(nameLines.length, prosLines.length, consLines.length, oppLines.length);
    checkPage(maxLines * LH.pt8_5 + 5);

    setFont("body", "bold");
    doc.setFontSize(9);
    color(C.ink);
    doc.text(nameLines, compCol.name, y);

    setFont("body");
    doc.setFontSize(8.5);
    color(C.ink2);
    doc.text(prosLines, compCol.pros, y);

    color(C.red);
    doc.text(consLines, compCol.cons, y);

    setFont("body", "italic");
    color(C.green);
    doc.text(oppLines, compCol.opp, y);

    y += maxLines * LH.pt8_5 + 3;
    if (i < report.competitor_weaknesses.competitors.length - 1) {
      drawRule(ML, ML + CW, y - 1);
    }
  }

  drawRule(ML, ML + CW, y + 1);
  y += 9;

  // ═══ 04 — Audience Language ═══
  if (report.audience_language.phrases.length > 0) {
    sectionNumber("04");
    sectionTitle("How your market actually describes this problem");

    setFont("mono");
    doc.setFontSize(6);
    color(C.ink4);
    doc.text("Use these phrases in your landing page, pitch deck, and App Store description.", ML, y);
    y += 5;

    for (const p of report.audience_language.phrases) {
      const phraseLines = splitText(`"${p.phrase}"`, CW - 30);
      checkPage(phraseLines.length * LH.pt9_5 + 4);

      setFont("display", "italic");
      doc.setFontSize(9.5);
      color(C.ink2);
      doc.text(phraseLines, ML, y);

      setFont("mono");
      doc.setFontSize(5.5);
      color(C.ink4);
      doc.text(p.source, ML + CW, y, { align: "right" });

      y += phraseLines.length * LH.pt9_5 + 2.5;
      drawRule(ML, ML + CW, y - 1);
    }
    y += 5;
  }

  // ═══ 05 — Build Recommendations ═══
  if (report.build_recommendations.recommendations.length > 0) {
    sectionNumber("05");
    sectionTitle("What to build first — ranked by evidence strength");

    for (let i = 0; i < report.build_recommendations.recommendations.length; i++) {
      const r = report.build_recommendations.recommendations[i];
      const bodyLines = splitText(r.body, CW - 12);
      checkPage(bodyLines.length * LH.pt8_5 + 14);

      // Big number
      setFont("display", "bold");
      doc.setFontSize(28);
      color(C.rule);
      doc.text(String(i + 1), ML, y + 6);

      // Title
      setFont("body", "bold");
      doc.setFontSize(10);
      color(C.ink);
      doc.text(r.title, ML + 12, y);
      y += 5;

      // Body
      setFont("body");
      doc.setFontSize(8.5);
      color(C.ink3);
      doc.text(bodyLines, ML + 12, y);
      y += bodyLines.length * LH.pt8_5 + 2;

      // Priority tag
      setFont("mono");
      doc.setFontSize(6);
      color(C.red);
      doc.text(`${r.priority.toUpperCase()} PRIORITY`, ML + 12, y);
      y += 6;

      if (i < report.build_recommendations.recommendations.length - 1) {
        drawRule(ML + 12, ML + CW, y - 2);
      }
    }
  }

  // ── Footer on last page ──
  y = PH - MB;
  setFont("mono");
  doc.setFontSize(5.5);
  color(C.ink4);
  drawRule(ML, ML + CW, y - 4, true);
  doc.text("Generated by Tethyr — tethyr.app", ML, y);
  doc.text(`${report.meta.search_duration_seconds}s search · ${new Date().toISOString().slice(0, 10)}`, ML + CW, y, { align: "right" });

  // Save
  const filename = `tethyr-${report.meta.report_id.toLowerCase()}.pdf`;
  doc.save(filename);
}
