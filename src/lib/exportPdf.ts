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

// Page geometry (A4)
const PW = 210;  // page width mm
const PH = 297;  // page height mm
const ML = 20;   // margin left
const MR = 20;   // margin right
const MT = 22;   // margin top
const MB = 20;   // margin bottom
const CW = PW - ML - MR; // content width

export function exportReportPdf(report: ReportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MT;

  // ── Helpers ──

  function setFont(style: "display" | "body" | "mono", weight: "normal" | "bold" | "italic" = "normal") {
    // jsPDF only has helvetica/courier/times built-in
    // Map: display → times (serif), body → times, mono → courier
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
      // Paper background
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
    y += lines.length * 5.5 + 3;
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
  y += queryLines.length * 6.5 + 4;

  drawRule(ML, ML + CW, y);
  y += 8;

  // ═══ 01 — Problem Validation ═══
  sectionNumber("01");
  sectionTitle("Problem Validation");

  // Verdict block
  if (report.meta.verdict_statement) {
    checkPage(14);
    const verdictC = VERDICT_COLOR[report.meta.verdict] || C.ink;
    // Left accent bar
    fillColor(verdictC);
    doc.rect(ML, y - 1, 1.2, 10, "F");
    // Light tinted background — blend verdict color with paper at ~8%
    const tint: [number, number, number] = [
      Math.round(C.paper[0] * 0.92 + verdictC[0] * 0.08),
      Math.round(C.paper[1] * 0.92 + verdictC[1] * 0.08),
      Math.round(C.paper[2] * 0.92 + verdictC[2] * 0.08),
    ];
    fillColor(tint);
    doc.rect(ML + 1.2, y - 1, CW - 1.2, 10, "F");

    setFont("body", "bold");
    doc.setFontSize(10);
    color(verdictC);
    const verdictLines = splitText(report.meta.verdict_statement, CW - 8);
    doc.text(verdictLines, ML + 4, y + 3);
    y += Math.max(verdictLines.length * 4.5, 10) + 5;
  }

  // Quotes
  for (const q of report.problem_validation.quotes) {
    const quoteLines = splitText(`"${q.text}"`, CW - 30);
    checkPage(quoteLines.length * 4 + 6);

    setFont("mono");
    doc.setFontSize(6);
    color(C.ink4);
    const srcLabel = q.source || "";
    const platLabel = SOURCE_REGISTRY[q.platform]?.display_name || q.platform;
    doc.text(srcLabel, ML + 24, y, { align: "right" });
    doc.text(platLabel, ML + 24, y + 3, { align: "right" });

    // vertical rule
    drawColor(C.rule);
    doc.setLineWidth(0.15);
    doc.line(ML + 26, y - 1, ML + 26, y + quoteLines.length * 4 + 1);

    setFont("body", "italic");
    doc.setFontSize(10);
    color(C.ink2);
    doc.text(quoteLines, ML + 30, y);
    y += quoteLines.length * 4 + 5;
  }

  drawRule(ML, ML + CW, y);
  y += 8;

  // ═══ 02 — Feature Gaps ═══
  sectionNumber("02");
  sectionTitle("What people actually want — ranked by frequency");

  // Table header
  checkPage(8);
  setFont("mono");
  doc.setFontSize(6);
  color(C.ink3);
  doc.text("#", ML, y);
  doc.text("GAP", ML + 8, y);
  doc.text("FREQ", ML + CW - 30, y);
  doc.text("STATUS", ML + CW - 12, y);
  y += 2;
  drawRule(ML, ML + CW, y, true);
  y += 4;

  for (let i = 0; i < report.feature_gaps.gaps.length; i++) {
    const g = report.feature_gaps.gaps[i];
    const gapText = `${g.title}: ${g.description}`;
    const gapLines = splitText(gapText, CW - 50);
    checkPage(gapLines.length * 3.8 + 4);

    setFont("mono");
    doc.setFontSize(6.5);
    color(C.ink4);
    doc.text(String(i + 1).padStart(2, "0"), ML, y);

    setFont("body");
    doc.setFontSize(9);
    color(C.ink2);
    doc.text(gapLines, ML + 8, y);

    setFont("mono");
    doc.setFontSize(6.5);
    color(C.ink4);
    doc.text(g.frequency, ML + CW - 30, y);

    color(g.status === "Unaddressed" ? C.red : C.ink4);
    doc.text(g.status.toUpperCase(), ML + CW - 12, y);

    y += gapLines.length * 3.8 + 3;
    if (i < report.feature_gaps.gaps.length - 1) {
      drawRule(ML + 8, ML + CW, y - 1);
    }
  }

  drawRule(ML, ML + CW, y + 1);
  y += 9;

  // ═══ 03 — Competitor Weaknesses ═══
  sectionNumber("03");
  sectionTitle("Competitor weaknesses — from their users' own words");

  // Table header
  checkPage(8);
  setFont("mono");
  doc.setFontSize(6);
  color(C.ink3);
  const colW = CW / 4;
  doc.text("COMPETITOR", ML, y);
  doc.text("WHAT USERS VALUE", ML + colW, y);
  doc.text("WHAT USERS HATE", ML + colW * 2, y);
  doc.text("YOUR OPENING", ML + colW * 3, y);
  y += 2;
  drawRule(ML, ML + CW, y, true);
  y += 4;

  for (let i = 0; i < report.competitor_weaknesses.competitors.length; i++) {
    const c = report.competitor_weaknesses.competitors[i];
    const prosText = c.pros.join(". ");
    const consText = c.cons.join(". ");

    const nameLines = splitText(c.name, colW - 4);
    const prosLines = splitText(prosText, colW - 4);
    const consLines = splitText(consText, colW - 4);
    const oppLines = splitText(c.opportunity, colW - 4);
    const maxLines = Math.max(nameLines.length, prosLines.length, consLines.length, oppLines.length);
    checkPage(maxLines * 3.8 + 5);

    setFont("body", "bold");
    doc.setFontSize(9);
    color(C.ink);
    doc.text(nameLines, ML, y);

    setFont("body");
    doc.setFontSize(8.5);
    color(C.ink2);
    doc.text(prosLines, ML + colW, y);

    color(C.red);
    doc.text(consLines, ML + colW * 2, y);

    setFont("body", "italic");
    color(C.green);
    doc.text(oppLines, ML + colW * 3, y);

    y += maxLines * 3.8 + 3;
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
      checkPage(phraseLines.length * 4 + 4);

      setFont("display", "italic");
      doc.setFontSize(9.5);
      color(C.ink2);
      doc.text(phraseLines, ML, y);

      setFont("mono");
      doc.setFontSize(5.5);
      color(C.ink4);
      doc.text(p.source, ML + CW, y, { align: "right" });

      y += phraseLines.length * 4 + 2.5;
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
      checkPage(bodyLines.length * 3.8 + 14);

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
      y += bodyLines.length * 3.8 + 2;

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
