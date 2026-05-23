// ============================================
// FamTastic — ChildHome (Duolingo-style home view)
// School + exams + separated chore sections
// ============================================

import React from 'react';
import { C, F, S, formatKr, getGreeting, streakEmoji, safeArray } from './data';
import { CheckCircle, Star, Flame, Zap } from 'lucide-react';

function fmtTime(t) { return t ? t.slice(0, 5) : ''; }

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T12:00:00');
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

// ─── Bakgrundsformer ──────────────────────────────────────────────────────────
function BgShapes() {
  return (
    <svg
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        opacity: 0.18, pointerEvents: 'none',
      }}
      viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <path d="M -40 -30 Q 100 -60, 180 80 Q 230 180, 120 240 Q 20 290, -30 180 Q -80 80, -40 -30 Z" fill="#3CB4A6" />
      <path d="M 300 -20 Q 430 10, 440 140 Q 448 230, 350 260 Q 260 285, 230 190 Q 205 105, 300 -20 Z" fill="#A8E6DF" />
      <path d="M 220 640 Q 400 600, 440 720 Q 462 800, 320 810 Q 180 818, 160 720 Q 145 640, 220 640 Z" fill="#FF7A59" />
      <path d="M -50 700 Q 50 650, 130 710 Q 185 755, 140 820 Q 75 855, -15 820 Q -90 790, -50 700 Z" fill="#FFA071" />
    </svg>
  );
}

export function ChildHome({
  member, todayChores, isCompleted, toggleChore, streak,
  balance, todayEvents, meal, poolCount, familyGoals, onGoToChores,
  todayLessons, schoolSpecial, morningSpecial, afternoonSpecial, exams,
}) {
  const schoolChores  = todayChores.filter(c => c.reference_id);
  const regularChores = todayChores.filter(c => !c.reference_id);

  const doneCount  = todayChores.filter(c => isCompleted(c.id)).length;
  const allDone    = todayChores.length > 0 && doneCount >= todayChores.length;
  const lessons    = safeArray(todayLessons);
  const upcomingExams = safeArray(exams).filter(e => daysUntil(e.exam_date) >= 0).slice(0, 3);
  const hasSchool  = lessons.length > 0 || schoolSpecial || morningSpecial || afternoonSpecial;

  function renderChoreRow(chore) {
    const done = isCompleted(chore.id);
    return (
      <button key={chore.id} onClick={() => toggleChore(chore.id)} style={{
        ...styles.choreRow,
        background:  done ? C.successLight : C.bgCard,
        borderColor: done ? C.success : C.borderLight,
      }}>
        <div style={{ ...styles.choreEmoji, background: done ? C.successLight : C.primaryLight }}>
          <span style={{ fontSize: 20 }}>{chore.icon || '📋'}</span>
        </div>
        <div style={styles.choreContent}>
          <span style={{ ...styles.choreTitle, textDecoration: done ? 'line-through' : 'none', color: done ? C.textMuted : C.text }}>
            {chore.title}
          </span>
          {!done && chore.chore_type === 'bonus' && chore.points > 0 && (
            <span style={styles.choreBonus}><Star size={10} color="#92400E" /> +{chore.points} kr</span>
          )}
        </div>
        {done ? <CheckCircle size={26} color={C.success} /> : <div style={styles.choreCheck} />}
      </button>
    );
  }

  return (
    <div style={styles.wrapper}>
      <BgShapes />

      <div style={styles.content}>
        {/* Greeting + streak */}
        <h1 style={styles.greeting}>{getGreeting(member.name)}</h1>
        {streak > 0 && (
          <div style={styles.streakPill}>
            <Flame size={18} color={C.primary} />
            <span style={styles.streakNum}>{streak}</span>
            <span style={styles.streakLabel}>{streak === 1 ? 'dag' : 'dagar'} i rad {streakEmoji(streak)}</span>
          </div>
        )}

        {/* Progress card */}
        {todayChores.length > 0 && (
          <div style={{
            ...styles.progressCard,
            background:  allDone ? `linear-gradient(135deg, ${C.successLight}, #ECFDF5)` : `linear-gradient(135deg, ${C.primaryLight}, ${C.accentLight})`,
            borderColor: allDone ? C.success : C.primary,
          }}>
            <span style={{ fontSize: allDone ? 32 : 28 }}>{allDone ? '🏆' : '💪'}</span>
            <div style={styles.progressInfo}>
              <span style={{ ...styles.progressTitle, color: allDone ? C.successDark : C.primaryDark }}>
                {allDone ? 'Alla klara idag!' : `${doneCount} av ${todayChores.length} klara`}
              </span>
              <div style={styles.progressBarBg}>
                <div style={{
                  ...styles.progressBarFill,
                  width: `${(doneCount / todayChores.length) * 100}%`,
                  background: allDone ? C.success : `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Balance pill */}
        <div style={styles.balancePill}>
          <span style={{ fontSize: 20 }}>💰</span>
          <span style={styles.balancePillLabel}>Mitt saldo</span>
          <span style={styles.balancePillAmount}>{formatKr(balance)}</span>
        </div>

        {/* School today */}
        {hasSchool && (
          <div style={styles.section}>
            <p style={S.sectionLabel}>🎒 Skola idag</p>
            {schoolSpecial && (
              <div style={styles.specialBanner}>
                <span style={{ fontSize: 16 }}>{schoolSpecial.icon || '🎉'}</span>
                <span style={styles.specialText}>{schoolSpecial.title}</span>
              </div>
            )}
            {morningSpecial && (
              <div style={styles.specialBanner}>
                <span style={{ fontSize: 16 }}>{morningSpecial.icon || '🎉'}</span>
                <span style={styles.specialText}>{morningSpecial.title} (fm)</span>
              </div>
            )}
            {afternoonSpecial && (
              <div style={styles.specialBanner}>
                <span style={{ fontSize: 16 }}>{afternoonSpecial.icon || '🎉'}</span>
                <span style={styles.specialText}>{afternoonSpecial.title} (em)</span>
              </div>
            )}
            {lessons.length > 0 && (
              <div style={styles.lessonList}>
                {lessons.map((l, i) => (
                  <div key={i} style={{ ...styles.lessonRow, borderLeftColor: l.color || C.secondary }}>
                    <span style={{ fontSize: 14 }}>{l.icon}</span>
                    <span style={styles.lessonTime}>{fmtTime(l.startTime)}{l.endTime ? `–${fmtTime(l.endTime)}` : ''}</span>
                    <span style={styles.lessonTitle}>{l.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming exams */}
        {upcomingExams.length > 0 && (
          <div style={styles.section}>
            <p style={S.sectionLabel}>📝 Kommande prov</p>
            {upcomingExams.map(exam => {
              const days   = daysUntil(exam.exam_date);
              const urgent = days <= 2;
              return (
                <div key={exam.id} style={{
                  ...styles.examCard,
                  borderColor: urgent ? C.primary : C.borderLight,
                  background:  urgent ? C.primaryLight : C.bgCard,
                }}>
                  <span style={{ fontSize: 20 }}>{exam.icon || '📝'}</span>
                  <div style={{ flex: 1 }}>
                    <span style={styles.examTitle}>{exam.title}</span>
                    <span style={styles.examDate}>
                      {days === 0 ? 'Idag!' : days === 1 ? 'Imorgon' : `Om ${days} dagar`}
                    </span>
                  </div>
                  {urgent && <span style={{ fontSize: 16 }}>⚠️</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* School-linked chores */}
        {schoolChores.length > 0 && (
          <div style={styles.section}>
            <p style={S.sectionLabel}>📖 Skoluppgifter</p>
            {schoolChores.map(renderChoreRow)}
          </div>
        )}

        {/* Regular chores */}
        {regularChores.length > 0 && (
          <div style={styles.section}>
            <p style={S.sectionLabel}>🧹 Sysslor</p>
            {regularChores.map(renderChoreRow)}
          </div>
        )}

        {/* Pool chores teaser */}
        {poolCount > 0 && (
          <button onClick={onGoToChores} style={styles.poolTeaser}>
            <span style={{ fontSize: 20 }}>🤲</span>
            <span style={styles.poolTeaserText}>{poolCount} öppna sysslor att plocka!</span>
            <Zap size={16} color={C.accent} />
          </button>
        )}

        {/* Today's events */}
        {todayEvents.length > 0 && (
          <div style={styles.section}>
            <p style={S.sectionLabel}>Idag</p>
            {todayEvents.map(ev => (
              <div key={ev.id} style={styles.eventRow}>
                <span>📅</span>
                <span style={styles.eventTitle}>{ev.title}</span>
                {ev.start_time && <span style={styles.eventTime}>{ev.start_time.slice(0, 5)}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Meal */}
        {meal && (
          <div style={styles.section}>
            <p style={S.sectionLabel}>Middag</p>
            <div style={styles.mealCard}>
              <span style={{ fontSize: 24 }}>🍽️</span>
              <span style={styles.mealText}>{meal}</span>
            </div>
          </div>
        )}

        {/* Family goal */}
        {familyGoals.map(fg => (
          <div key={fg.id} style={styles.section}>
            <p style={S.sectionLabel}>Familjemål</p>
            <div style={styles.familyGoalCard}>
              <span style={{ fontSize: 24 }}>{fg.icon || '🎯'}</span>
              <div style={{ flex: 1 }}>
                <span style={styles.fgTitle}>{fg.title}</span>
                <span style={styles.fgTarget}>{formatKr(fg.target_amount)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { position: 'relative', overflow: 'hidden' },
  content: { padding: '12px 16px', position: 'relative', zIndex: 1 },
  greeting: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: '0 0 8px' },
  streakPill: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: C.primaryLight, border: `1.5px solid ${C.primary}`, marginBottom: 12 },
  streakNum: { fontSize: F.sizes.lg, fontWeight: F.weights.extra, fontFamily: F.heading, color: C.primaryDark },
  streakLabel: { fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, color: C.primaryDark },
  progressCard: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, border: '1.5px solid', marginBottom: 12 },
  progressInfo: { flex: 1 },
  progressTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, marginBottom: 8 },
  progressBarBg: { height: 6, background: 'rgba(255,255,255,0.6)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 },
  progressBarFill: { height: '100%', borderRadius: 99, background: C.primary, transition: 'width 0.4s ease' },
  balancePill: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: C.bgCard, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  balancePillLabel: { flex: 1, fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading },
  balancePillAmount: { fontSize: F.sizes.xl, fontWeight: F.weights.extra, fontFamily: F.heading, color: C.text },
  section: { marginBottom: 16 },
  specialBanner: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: C.accentLight, borderRadius: 12, border: `1px solid ${C.accent}`, marginBottom: 4 },
  specialText: { fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, color: '#92400E' },
  lessonList: { display: 'flex', flexDirection: 'column', gap: 2 },
  lessonRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderLeft: '3px solid', borderRadius: '0 8px 8px 0', background: 'rgba(0,0,0,0.02)' },
  lessonTime: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, fontWeight: F.weights.semi, minWidth: 72, flexShrink: 0 },
  lessonTitle: { fontSize: F.sizes.sm, color: C.text, fontFamily: F.heading, fontWeight: F.weights.semi },
  examCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, border: '1.5px solid', marginBottom: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  examTitle: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  examDate: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, marginTop: 2 },
  choreRow: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', borderRadius: 14, border: '1.5px solid', marginBottom: 8, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' },
  choreEmoji: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  choreContent: { flex: 1, minWidth: 0 },
  choreTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading },
  choreBonus: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: '#92400E', background: C.accentLight, padding: '1px 8px', borderRadius: 99, marginTop: 4 },
  choreCheck: { width: 26, height: 26, borderRadius: 13, border: `2.5px solid ${C.border}`, flexShrink: 0 },
  poolTeaser: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 16px', borderRadius: 14, border: `2px dashed ${C.accent}`, background: C.accentLight, cursor: 'pointer', marginBottom: 16, textAlign: 'left' },
  poolTeaserText: { flex: 1, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: '#92400E' },
  eventRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: C.bgCard, borderRadius: 12, border: `1.5px solid ${C.borderLight}`, marginBottom: 6 },
  eventTitle: { flex: 1, fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, color: C.text },
  eventTime: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
  mealCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: C.bgCard, borderRadius: 14, border: `1.5px solid ${C.borderLight}` },
  mealText: { fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  familyGoalCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: `linear-gradient(135deg, ${C.primaryLight}, ${C.accentLight})`, borderRadius: 16, border: `1.5px solid ${C.primary}` },
  fgTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.primaryDark },
  fgTarget: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
};
