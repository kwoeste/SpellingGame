# Modeling maewoeste.com on Alpha School — research, gap list, build plan

Status: draft design (Oct 25, 2026). No code in this PR.

## 1. Alpha School's model (public sources)

| Pillar | What Alpha does | Source |
|---|---|---|
| 2-hour academic block | Guide-led "launch", then ~2 h of core skills on the Timeback dashboard in short focus cycles with movement breaks; afternoons are "time back". | [alpha.school: how the 2-hour day works](https://alpha.school/resources/how-alpha-two-hour-school-day-works/), [AI tutors blog](https://alpha.school/blog/the-two-hour-school-day-how-ai-tutors-are-redefining-learning-efficiency/) |
| Mastery gates | Advance only at ≥90% (placement tests count 89.5%+). Fail → drop a grade until passed; 59.5–89.5% earns a **hole-filling course** for that grade. | [Timeback placement guide](https://support.alpha.school/article/133839-quick-start-guide-placement-tests-in-timeback), [Timeback parent guide (PDF)](https://support.alpha.school/api/v1/articles/134425/attachments/1949856/download) |
| Gap detection ("CAT scan") | Diagnostic (MAP) + AI builds a personal plan and sends kids back to fill prior gaps; students with A/B grades often 3+ years behind. | [Redefining School](https://alpha.school/blog/redefining-school-in-the-21st-century/), [The 74 interview w/ MacKenzie Price](https://www.the74million.org/article/how-alpha-uses-ai-to-rethink-the-school-experience/) |
| Difficulty band | Keep performance ~70–95%; AlphaRead keeps text within ~10% of the reader's level. | [The Batch](https://www.deeplearning.ai/the-batch/inside-alpha-school-a-texas-based-program-using-algorithms-and-video-monitors-to-teach-children), [Austin Scholar: Alpha app stack](https://austinscholar.substack.com/p/austin-scholar-177-the-alpha-app) |
| App stack (dashboard routes to best app) | Math Academy (4–12, worked examples, spaced review), Synthesis (K-3), AlphaMath Fluency, AlphaRead → TeachTales → books, AlphaWrite, Khan, formerly IXL. Content tied to Core Knowledge. | [Austin Scholar](https://austinscholar.substack.com/p/austin-scholar-177-the-alpha-app), [10 AI tools](https://alpha.school/blog/10-ai-tools-we-use-at-alpha-and-you-should-too/), [The Neuron](https://www.theneuron.ai/explainer-articles/unlocking-the-future-joe-liemandt-on-how-ai-is-making-school-obsolete/) |
| Spaced repetition | Described by a parent as a "turbocharged spreadsheet checklist with a spaced-repetition algorithm"; Math Academy is built on it. | [The Batch](https://www.deeplearning.ai/the-batch/inside-alpha-school-a-texas-based-program-using-algorithms-and-video-monitors-to-teach-children) |
| Waste meter / anti-patterns | Tracks time "burned"; flags rushing (<20 s/question **and** below 80–100% zone), skipping explanations after mistakes, scrolling without reading, repeating mastered work, skipping recommended order. Now coaching-only, never blocks. | [Anti-patterns support article](https://support.alpha.school/article/31771-understanding-and-addressing-learning-anti-patterns), [AI & gamification blog](https://alpha.school/blog/how-ai-and-gamification-transform-learning-at-alpha-school/), [Timeback events: active/inactive/waste/anti-pattern](https://docs.timeback.com/beta/build-on-timeback/reference/timeback-events) |
| XP & goals | 1 XP ≈ 1 engaged minute; daily target ~120 XP as closable rings per subject; below-mastery first attempt earns 0 XP, re-attempts earn 50%/25%/0, 100% first try earns +20–25% bonus, gaming can earn negative XP. Goals set by student + parent + guide. | [Timeback XP system](https://docs.platform.timeback.com/getting-started/xp-system), [Timeback principles](https://docs.timeback.com/beta/about-timeback/principles), [Parent guide](https://support.alpha.school/api/v1/articles/134425/attachments/1949856/download) |
| Motivation | "Motivation is 90% of the solution"; time back is the reward; kids must love school more than vacation. No chatbots ("cheatbots"); AI coaches *how* to learn (slow down, review, watch an explainer). | [Joe Liemandt's vision](https://alpha.school/the-future-of-education-joe-liemandts-vision-for-alpha-school/), [The Neuron](https://www.theneuron.ai/explainer-articles/unlocking-the-future-joe-liemandt-on-how-ai-is-making-school-obsolete/) |
| Guides, not teachers | Adults coach motivation/resilience (~1:12), don't lecture or grade. Progress visible live to student, guide, parent. | [Liemandt vision](https://alpha.school/the-future-of-education-joe-liemandts-vision-for-alpha-school/), [2-hour day](https://alpha.school/resources/how-alpha-two-hour-school-day-works/) |
| Afternoon life skills | Entrepreneurship, public speaking, leadership, athletics, hard physical goals (2nd graders run a 5k). | [AI tutors blog](https://alpha.school/blog/the-two-hour-school-day-how-ai-tutors-are-redefining-learning-efficiency/), [Liemandt vision](https://alpha.school/the-future-of-education-joe-liemandts-vision-for-alpha-school/) |
| Measure with 3rd-party tests | MAP Growth 3×/yr; "don't trust what we tell you, trust the third-party test." | [The 74](https://www.the74million.org/article/how-alpha-uses-ai-to-rethink-the-school-experience/), [Liemandt vision](https://alpha.school/the-future-of-education-joe-liemandts-vision-for-alpha-school/) |

Caveats worth keeping in view: Alpha's camera-based monitoring is the most criticized part, and its gains are self-reported / not rigorously studied ([The Batch](https://www.deeplearning.ai/the-batch/inside-alpha-school-a-texas-based-program-using-algorithms-and-video-monitors-to-teach-children)). **We copy the mechanics, not the webcam**: all signals here come from taps, timing and audio state in our own app; nothing leaves our Vercel + Neon stack, no third-party analytics, no LLM sees her answers.

Note: Alpha publishes no "learning-modality bandit". Their version is coarser: the dashboard picks the best *app* per subject/level and the coach tells a kid to watch an explainer when accuracy/time look off. The modality engine below is our extension of that idea, done per concept and kept explainable.

## 2. What maewoeste.com already has (main @ 8215756)

| Area | Have | Where |
|---|---|---|
| Content | 51 chapters (science 8, ELA 9, religion 25 [gated], math 9); concept catalog with hard prereqs | `lib/content/*` |
| Mastery model | BKT pMastery + Elo θ per concept, item ratings | `lib/engine/bkt.ts`, `elo.ts` |
| Gates | Concept gate pMastery ≥0.95 & gate ≥90% & no rapid guess; chapter gate ≥90% with core concepts ≥80% | `lib/engine/gating.ts` |
| Spaced review | Leitner boxes 0,1,3,7,14,30,60 days per item; rusty detection | `lib/engine/scheduler.ts` |
| Zone | EWMA rolling success, target 0.72–0.9, `zone_down/up` decisions logged | `lib/engine/zone.ts` |
| Stuck help | Miss 4 hint, miss 5 Show me/Skip, re-teach flag → next-day "Let's try this again" (recap→read→item) | `lib/help/ladder.ts`, `service.ts` |
| Modalities that exist | Watch it recap (4 chapters here; more being added in /workspace/sg), Careful Read (paced reveal), Read-aloud TTS, Try it at home, vocab/order/proof steps, games (13 named + Spelling Safari + Number Match) | `components/*`, `lib/content/recaps.ts` |
| XP | 10 XP per engaged minute; 0 for idle >45 s, majority rapid guess, hidden video; week ring 600 XP; streaks; badges | `lib/engine/xp.ts`, `service.ts` |
| Anti-patterns | Rapid guess <1.5 s on wrong answers; `classifySkim` (admin inference only); strategy labels | `service.ts`, `lib/admin/infer.ts` |
| Admin | Overview, knowledge map, holes (prereq walk), suggested hole-fill assignments, wrong answers + needs re-teach, sessions with needed-help pill, goals (weekly XP, daily minutes) | `app/admin/_ui/*`, `lib/admin/*` |

## 3. Gap list (vs Alpha)

1. **No "today's plan".** Dashboard shows one quest + re-teach cards; no ordered daily list with a time/XP goal and rings per subject. Admin has `dailyMinutesGoal` but Mae never sees it.
2. **Item selection is unused.** `itemSelectionScore` / `pickBestItem` exist but chapters run in fixed order; due reviews and hole fills are never pulled into a session.
3. **Spaced reviews aren't served.** Review rows are written and shown in admin, but no student surface serves due items (only re-teach flags are surfaced).
4. **Hole filling is admin-only.** Holes and suggested assignments are computed but don't automatically enter her plan.
5. **No modality tracking.** Every chapter runs recap → read → steps; nothing records which way of teaching worked.
6. **Anti-rushing is weak for a fast reader.** Only <1.5 s wrong answers count; nothing for reading faster than the text allows, skipping narration, tapping Next before audio ends, or ignoring the explanation after a miss. No kid-facing coaching.
7. **XP doesn't reward accuracy.** XP is pure engaged time; Alpha gates XP on mastery (0 below 80%, bonus at 100% first try, reduced on re-attempts).
8. **Gates are uneven.** Concept gate needs pMastery 0.95 (stricter than Alpha), but there's no "can't open next chapter until this one is ≥90%" rule in the student path, and no placement test.
9. **No third-party benchmark.** Nothing like MAP; no periodic standardized check.
10. **No life-skills / "time back" loop.** Finishing doesn't unlock anything in the real world.
11. **Guide view is retrospective.** No live "what is she doing right now / is she stuck / is she rushing" panel for Kevin.

## 4. Design: learning-modality engine

### 4.1 Modalities
`watch_recap`, `careful_read`, `listen` (read-aloud with karaoke highlight, Next locked until audio ends), `hands_on` (Try it at home / manipulative), `game` (matching named game for the concept), `worked_example` (new: a solved example step by step, then a near-copy for her to do — the Math Academy pattern). A concept has the modalities whose content exists; missing ones are simply not arms.

### 4.2 Episode = one teaching attempt
`modality_episode { id, learner_id, concept_id, subject, modality, chosen_by (bandit|explore|forced|reteach), started_at, teach_ms, narration_completed bool, check_item_ids[], first_try_correct, hints, reveals, skips, rushed_flags, retention_correct (nullable, filled 1–7 days later), status }` — new table in our Neon DB, RLS like the other engine tables.

Outcome per episode (0–1, documented in code):
- `immediate` = first-try correct on the follow-up check (1–3 items), hint/reveal counts as 0.
- `retention` = first-try correct on that concept's next spaced review ≥ 20 h later.
- `reward = 0.4·immediate + 0.6·retention` (retention weighted higher — that's what learning means). Until retention arrives, the episode contributes only its immediate part with half weight.
- Episodes with ≥2 rushing flags are recorded but **excluded** from the bandit (we learn about rushing, not about the modality).
- Time is tracked and shown, used only as a tiebreak (cheaper modality wins when posteriors overlap).

### 4.3 Chooser: Thompson sampling with a floor
- Beta(1,1) prior per (subject, modality); a concept-level posterior is pooled toward its subject's (hierarchical shrinkage: concept counts added to subject counts with weight 0.5) so one concept's 2 episodes don't dominate.
- Each new concept: with probability ε = max(0.15, 0.5 − 0.02·n_subject_episodes) pick a modality round-robin among least-tried; otherwise sample each Beta and take the max.
- Re-teach after miss 4: force a **different** modality from the one that failed (ladder stays the same).
- Deterministic seeded RNG per (learner, concept) so a reload doesn't change the pick; every choice logged as an `adaptation_decision` with the sampled values — fully explainable.

### 4.4 "How Mae learns best" (admin)
Per subject: a row per modality with episodes, immediate %, retention %, avg minutes, hint/reveal rate, rushed %, and the posterior mean with an 80% credible interval. Labels:
- `< 8 episodes in subject` → "Still exploring — not enough evidence yet".
- intervals overlap → "No clear winner yet".
- best's lower bound > runner-up mean and ≥ 8 episodes → "Likely best: Watch it (78% remembered next day, 12 tries)".
Plus a plain-English summary ("In science, Mae remembers more after the picture recap than after reading alone"), never shown to Mae.

### 4.5 Anti-rushing (kind, coaching-only, like Alpha's current policy)
Signals (all local):
- `answer_too_fast`: latency < max(2.5 s, 60 ms × words in stem+choices) — applies to right answers too.
- `read_too_fast`: Careful Read finished at > 2× her own median words/min (and > 250 wpm absolute).
- `skipped_narration`: Next tapped / audio paused before 80% of narration.
- `skipped_explanation`: after a wrong answer, explanation dismissed in < 2 s.
- `streak_guessing`: ≥3 wrong in a row each < 3 s.
Responses: Mae gets a friendly "Slow-down Sam" nudge ("Whoa, speedy! Read it once more with the reader?") and the Next button waits for narration on that screen; those minutes earn 0 XP (no negative XP — she's 3rd grade). Kevin sees a per-session "rush meter" and weekly trend.

### 4.6 Mastery gates + Today's plan
- Chapter N+1 in a subject unlocks after chapter N's gate ≥ 90% (admin override). Re-try of a failed gate starts with a different modality.
- `todayPlan(learner, now)`: daily minutes goal (default 30 for her, configurable) split into ordered blocks: 1) re-teach cards, 2) due spaced reviews (cap 8 items, ~5 min), 3) hole-fill concept if any, 4) current chapter (modality chosen by bandit), 5) one game for the concept as the reward. Shown as a checklist with rings and "Time back!" when done. XP target derived from minutes (10 XP/min) with Alpha-style accuracy weighting (see P4).

## 5. Prioritized build plan

Effort: S ≈ ½ day, M ≈ 1–2 days, L ≈ 3–5 days (one worker, with tests).

| # | Item | Why (gap) | Effort |
|---|---|---|---|
| P1 | **Today's plan** on /study: re-teach → due reviews → hole fill → current chapter → game; daily minutes goal ring; "Time back!" finish state | 1, 3, 4 | M |
| P2 | **Serve due spaced reviews** as a short "Warm-up" session using existing review rows + `itemSelectionScore` | 2, 3 | M |
| P3 | **Anti-rushing signals + kind nudges** (answer_too_fast, read_too_fast, skipped_narration, skipped_explanation), XP 0 for rushed minutes, rush meter in admin | 6 | M |
| P4 | **Modality episodes table + logging** for existing modalities (watch, read, listen, hands-on, game) and follow-up check items; retention join from reviews | 5 | M |
| P5 | **Thompson chooser** with ε floor, pooling, forced-different on re-teach, seeded RNG, decision logging | 5 | M |
| P6 | **"How Mae learns best"** admin tab with evidence/confidence and the not-enough-data rules | 5, 11 | M |
| P7 | **Chapter-to-chapter 90% gate** in the student path + admin override; failed gate re-try with a different modality | 8 | S |
| P8 | **Accuracy-weighted XP** (0 XP below 80% on a check, +20% for perfect first try, 50% on re-attempt) — keep time XP as the base | 7 | S |
| P9 | **Worked-example modality** for math (content + component) and **listen** mode with locked Next | 5 | L |
| P10 | **Live guide view** for Kevin: current activity, stuck/rushing now, today's plan progress | 11 | M |
| P11 | **Quarterly benchmark**: short placement-style check per subject (or record MAP/i-Ready scores Kevin enters) and show growth | 9 | M |
| P12 | **Time-back / life-skills loop**: Kevin-defined afternoon "quests" (bake, build, present) unlocked when the plan is done, with photo-free checkoff | 10 | S |

Suggested order: P1+P2 (one PR), P3, P4+P5, P6, P7+P8, then P9–P12. Roughly 3–4 weeks of focused work total.

## 6. Guardrails
- Kid-appropriate: no negative XP, no shaming copy, nudges are optional-sounding; never show Mae modality stats.
- Private: all data in our Neon DB under RLS; no webcam, no third-party analytics, no external LLM calls with her answers; TTS cache already server-side.
- Explainable: every pick is a logged decision with inputs; thresholds are named constants with tests.
- No conclusions early: minimum-evidence rules enforced in code and UI.
