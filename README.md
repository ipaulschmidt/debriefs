# Post Event Feedback Tool

Build a web app called "Debrief" for running post-event team retrospectives through asynchronous one-on-one AI interviews instead of group meetings.

PROBLEM IT SOLVES

After a trade show, campaign, or project, teams run a group retro. Those meetings fail predictably: the loudest or most senior voice anchors the discussion, junior people stay quiet, groups gravitate toward what everyone already knows and never surface the observation only one person had, and someone has to write the whole thing up afterward. This app interviews the organizer to build the right question set, then interviews each participant privately and asynchronously, then synthesizes everyone's input into one honest report with owned action items.

CORE DESIGN PRINCIPLE

Collect independently, synthesize centrally. No participant ever sees another participant's answers, a running summary, or any indication of what others have said. This is what removes the social dynamics that distort group retros, and it must not be compromised anywhere in the participant-facing UI.

CONFIDENTIALITY MODEL (applies throughout)

This app does NOT offer anonymity and must never claim it does. What it offers is: the report is written at the process level and never names anyone, participants never see each other's answers, and an admin can view individual responses only through a deliberate, logged action. Every piece of participant-facing copy must describe this accurately. Do not use the word "anonymous" anywhere in the participant experience.

V1 SCOPE

Event retros only (trade shows, conferences). No CRM, Slack, email, or calendar integrations. Objective metrics are entered manually. The retro object carries a "type" field set to "event" so other types (campaign, project, client offboarding) can be added later without a rebuild, but only build the event type now.

=====================

ORGANIZER FLOW

=====================

STEP 1: Create the retro shell

Name, type (event, fixed for now), event date, interview deadline. That's all. Everything else comes from the intake interview.

STEP 2: AI intake interview with the organizer

Instead of a context form, the app interviews the organizer in the same adaptive multi-turn format participants will experience. Target 10 minutes. Text or voice input, same as the participant interview.

The intake must cover these areas, probing where answers are thin:

- What the event was, how many days, and who from the team attended and in what role

- What we were trying to get out of it, and whether those goals were written down beforehand or are being reconstructed now (if they were never written down, note that; it is itself a finding for the report)

- What was different about this one compared to last time, or compared to shows we normally do

- What we specifically invested in or bet on this year

- What the organizer was worried about going in

- What the organizer has already heard, formally or in passing

- Whether anything here is sensitive or contentious, so the participant interviewer can probe carefully rather than walking into it cold

- What decisions are actually on the table for next time (return or not, booth redesign, staffing model, budget change)

Push hardest on that last one. Questions should be reverse-engineered from the decisions the report needs to support, and a retro that does not inform a real decision produces a document people compliment and ignore.

Store the intake as its own transcript and generate a structured summary (goals, what changed this year, investments made, decisions pending, sensitive areas) attached to the retro.

STEP 3: Generate the participant question set (two layers)

The question set is a FIXED SPINE that never changes across events, plus VARIABLE PROBES generated from the intake.

The fixed spine, eight areas plus a closer, always in this order:

1. Their role and what they were responsible for day to day

2. Gut verdict on whether this was worth doing again and why (asked early, before they reason themselves into a defensible position)

3. What worked well enough that we should do it exactly the same way next time

4. What wasted their time or made their job harder than it needed to be

5. The visitor experience: what people asked first when they walked up, what they seemed confused about or needed explained, and any pattern in who stopped versus who walked past (richest area, deserves the most probing)

6. Logistics and staffing: setup and teardown, what broke or nearly broke, whether shift coverage matched actual traffic

7. Leads: how they captured them, whether they could qualify someone on the spot, and whether they know what happened to those leads afterward

8. The three structural questions, always last and always in this order: what did you notice that you think nobody else noticed / was there a moment you wanted to say something and didn't and what was it / if this were entirely your call next year, what is the first thing you would change

Closer: "Anything I should have asked you about and didn't?"

Do not let the generator modify, reorder, or drop spine areas. It only adds probes.

Variable probes are generated from the intake summary and attached to whichever spine area they belong in, so the interview still flows rather than appending a list of extras at the end.

CRITICAL GENERATION RULE (this is the part most likely to ruin the output):

The organizer's input determines which topics get probed and NEVER what answer gets suggested. If the organizer's opinion leaks into a question, you have reinstalled the loudest voice in the room inside every interview, invisibly, which is worse than the meeting it replaced because nobody can see it happening.

Use this as the generation system prompt:

---

You are writing supplementary interview questions for a team retro, based on a private intake interview with the organizer. These questions go to participants who must never learn what the organizer thinks.

Convert every organizer statement into a neutral probe of the same topic. The topic survives. The hypothesis does not. Worked examples:

- Organizer says "I think the booth messaging was too vague" -> "What did visitors seem to understand about what we do, and what did they ask you to clarify?"

- Organizer says "I'm worried the demo station was a waste of money" -> "How did the demo station factor into your conversations, if at all?"

- Organizer says "I heard the shift schedule was a mess" -> "How did shift coverage line up with actual traffic?"

- Organizer says "we tripled the booth budget this year" -> "Was there anything we spent on that clearly paid off, or clearly didn't?"

Reject and rewrite any question that contains a verdict, uses an evaluative adjective about the thing being asked about, or invites agreement. Specifically ban constructions like "did you also...", "was it too...", "didn't it seem...", "how frustrating was...".

Generate 3 to 6 probes total. Fewer good ones beats more. For each, output: the question text, which spine area (1-8) it attaches to, and the intake statement it was derived from.

Return JSON: { "probes": [{ "question": "...", "spineArea": n, "derivedFrom": "the organizer statement this came from" }] }

---

STEP 4: Organizer reviews the question set

Show the full interview plan: the fixed spine areas plus each generated probe, with the intake statement it came from displayed beside it so the organizer can see the lineage and spot leakage themselves. Allow editing and removing probes, but not editing the spine.

Put a persistent note on this screen: "Avoid questions that suggest an answer. If a question tells someone what you think, it will shape what eight people tell you back." Under time pressure the organizer's instinct is to sharpen questions toward what they already believe, and this screen is where that happens.

STEP 5: Participants and objective numbers

Add participants: name, email, role at the event (e.g. "booth staff, days 1-2", "ran the demo station", "speaker"). Pre-populate from whoever the organizer named during intake, editable.

Manual metrics entry: badge scans, meetings booked, leads created, pipeline sourced, total cost, each with an optional prior-year value, plus a free-text field for other metrics. No integrations.

STEP 6: Send invites

Each participant gets an emailed magic link with a unique token. Do NOT require participants to create accounts or passwords; adoption dies if eight people have to sign up. The invite states: roughly how long it takes (10-15 minutes), that they can type or speak their answers, that the final report describes what happened and never who said it, that a retro admin can review individual responses if there is a specific reason and that those reviews are logged, and the deadline.

=====================

PARTICIPANT INTERVIEW

=====================

This must be a real multi-turn adaptive conversation, NOT a form with pre-written questions displayed in sequence. When someone says "traffic was slow," the interviewer asks "slow compared to what?", "what changed from last year?", "what were people asking when they did stop?" The follow-up probing is the entire reason this beats a Google Form.

Requirements:

- Opens with a plain-language confidentiality statement, worded accurately: the report describes what happened and never names who said it, a theme has to come up in at least two separate interviews before it appears in the report, colleagues will never see individual responses, a retro admin can review individual responses if there is a specific reason and every such review is recorded, and any answer can be marked sensitive.

- The same intro must also say plainly that follow-up questions are normal and expected, and do not mean the first answer was wrong. Without that, people read the first probe as being challenged and either shut down or start writing for the grader.

- Each answer can be typed OR recorded by voice (browser mic capture, transcribed server-side). People say more out loud than they type, especially about awkward things. Show the transcript back for correction.

- A visible "mark as sensitive" toggle next to every answer. Those answers are never quoted in the report and are flagged prominently in the admin view.

- Save and resume, since people will do this from an airport.

- Roughly 10 to 15 exchanges total including follow-ups, capped so it does not ramble. Eight spine areas plus a few probes is the right budget for that; the interviewer should combine or skip an area already covered by a previous answer rather than asking redundantly.

- Closes by saying what happens next and when they will see the report.

The interviewer receives the spine areas plus the approved probes plus the retro context, and tracks coverage so it neither skips an area nor overruns. It must never reveal anything from the organizer intake.

INTERVIEW TURN LOGIC

Each turn runs server-side and returns structured JSON. The model does not freely generate the next question; it first assesses the answer it just received, then chooses an action under the rules below. A coverage checklist alone makes a model rush to cover everything and accept thin answers, so probing has to be a required step with its own rules rather than a stated preference.

Input to each call: conversation history, the fixed spine areas plus approved probes, coverage state (areas covered, probes used in the current area), turn count against cap, and the participant's role_at_event.

Required output:

{

  "lastAnswerAssessment": {

    "quality": "thin" | "adequate" | "rich" | "not_applicable",

    "reasoning": "one line"

  },

  "action": "probe" | "advance" | "close",

  "probeType": "example" | "comparison" | "consequence" | "counterfactual" | "clarification" | null,

  "nextQuestion": "...",

  "currentArea": n,

  "areasCovered": [n],

  "probesUsedThisArea": n

}

Assessing the answer:

- thin: a generality with no specific example, moment, number, or detail. "It was fine." "Pretty good." "The usual issues." "Yeah, busy."

- adequate: contains at least one concrete detail or example but leaves an obvious gap.

- rich: specific, detailed, gives you something you could act on.

- not_applicable: the participant credibly did not have exposure to this area (check against role_at_event). This is a COMPLETE answer, not a thin one.

Rules:

- Never advance away from a spine area on a "thin" answer without at least one probe attempt.

- Maximum 2 probes per area. If the answer is still thin after two, record it and advance. Some people genuinely have nothing to say about a given area, and grinding on them wastes the remaining budget and sours the experience.

- "not_applicable" advances immediately with no probe.

- Spine area 8 (the three structural questions) is MANDATORY and protected. If the turn budget is running short, drop probes and compress earlier areas, never these. Ask all three.

- If three consecutive answers come back thin, acknowledge it directly and offer to move faster ("sounds like a lot of this wasn't your area, want me to skip to the last few?") rather than continuing to grind.

Probe types and how they sound:

- example: "Think of one specific time that happened. Walk me through it."

- comparison: "Slow compared to what? What did it look like last year?"

- consequence: "What did that cost you, in time or in conversations you didn't get to have?"

- counterfactual: "What would have had to be different for that to have gone well?"

- clarification: "When you say setup was rough, what specifically went wrong?"

BANNED PROBES: "Can you say more about that?", "Can you elaborate?", "Interesting, tell me more.", "Why do you say that?" These are lazy and reliably produce a second thin answer. Every probe must ask for something concrete: a moment, a comparison, a cost, or a specific.

Interview completeness:

When the interview closes, store a completeness score on the participant record: the count of areas answered at adequate or better over the number of areas asked, plus a flag for interviews where more than half the answers were thin. Store the per-answer quality assessment on each turn. Pass all of this to the synthesis step.

=====================

SYNTHESIS

=====================

Once the deadline passes or all interviews complete, generate the report from all participant transcripts plus the manual metrics. The organizer intake informs context but is NOT treated as a participant response and its opinions never become findings.

System prompt:

---

You are synthesizing private one-on-one retro interviews from a team that just worked an event together. Produce one honest, process-level report.

Hard rules:

- Never name an individual. Never include identifying detail that would let a reader work out who said something (for an eight-person team, "the person running the demo station" identifies one human being; write it as a process observation instead).

- A theme must appear in at least two separate interviews before you report it as a finding. Observations raised by only one person go in a separate section, described generally, without detail that fingerprints the source.

- Weight evidence by answer quality. You receive a quality assessment for each answer. Two thin, vague agreements on a topic are weaker evidence than two detailed accounts, and must not be presented with equal confidence. If a finding rests entirely on thin answers, say so in its detail field rather than stating it as firmly as a well-evidenced one.

- Anything marked sensitive informs your understanding but is never quoted or surfaced as a finding.

- The organizer's intake is background only. Do not treat their opinions as findings and do not let them influence which participant themes you elevate.

- Do not smooth over disagreement. If four people said the booth was well staffed and three said it was not, that split IS the finding. Report it as a split rather than picking a side or averaging it.

- Do not over-weight the most articulate or longest responses. A short blunt answer and a polished paragraph carry equal weight, provided both are specific.

- Do not reach for diplomatic phrasing that drains the meaning out of a criticism. If the process broke, say it broke. Describe what went wrong at the level of process and decisions, never at the level of a person's performance.

- Evaluate against the goals captured in intake. If no goals were set before the event, say so plainly as a finding.

Return structured JSON:

{

  "executiveSummary": "3-4 honest sentences a leader reading only this would still get right",

  "againstStatedGoals": "how the event performed against what we said we wanted, or a note that no goals were set beforehand",

  "whatWorked": [{ "finding": "...", "mentionCount": n, "evidenceStrength": "strong" | "moderate" | "weak", "detail": "...", "sourceParticipantIds": ["..."] }],

  "whatDidntWork": [{ "finding": "...", "mentionCount": n, "evidenceStrength": "strong" | "moderate" | "weak", "detail": "...", "sourceParticipantIds": ["..."] }],

  "disagreements": [{ "topic": "...", "splitDescription": "how the team divided and roughly how many each way", "sourceParticipantIds": ["..."] }],

  "singleSourceObservations": [{ "observation": "described without identifying detail", "sourceParticipantId": "..." }],

  "decisionInputs": [{ "decision": "a decision the organizer said is on the table", "whatTheEvidenceSays": "..." }],

  "recommendedActions": [{ "action": "specific and concrete", "rationale": "..." }]

}

sourceParticipantIds are stored for admin drill-down only and must NEVER be rendered in the shared report view.

---

=====================

REPORT AND ADMIN VIEWS

=====================

Shared report view (everyday view, what the team sees)

Render the synthesis with manual metrics alongside, including year-over-year deltas where a prior-year value exists, plus participation stats ("7 of 8 interviews completed"). Show evidenceStrength on each finding so readers can tell a well-supported finding from a thinly supported one. No attribution anywhere in this view, for anyone, including admins. Exportable as PDF and copy-as-text, and exports must never include participant identifiers.

Admin attribution view (gated and logged)

Accessible only to users with the attribution_admin role on that retro.

- Default state: admins see the same unattributed report as everyone else. Attribution is hidden by default even for them, so casual browsing does not happen.

- Each finding has a "reveal sources" control. Activating it opens a dialog requiring a typed reason (minimum ~10 characters) before attribution appears. On confirm, the finding expands to show contributing participants with links to the relevant transcript excerpts.

- A separate "view full transcript" option per participant, gated the same way.

- Answers marked sensitive appear with a clear visual flag and a note that the participant asked for extra care.

- Every reveal writes a log record: admin, retro, target, typed reason, timestamp.

- An access log screen visible to admins by default, in plain language, so the record is obviously real and not buried.

=====================

ACTION ITEMS AND CARRY-FORWARD

=====================

After the report generates, the organizer assigns an owner and due date to each recommended action. These persist with a status (open, done, dropped).

When a new retro of the same type is created, it opens by displaying the previous retro's action items and their status, the organizer intake asks what happened to them, and the participant interviewer probes the relevant ones ("last year we said we'd assign someone to qualify leads at the booth, did that happen and did it help?"). Without this loop the app produces documents nobody acts on, which is the real problem it exists to solve.

=====================

DATA MODEL (Supabase)

=====================

- retros: id, name, type ("event"), event_date, interview_deadline, status (draft/intake/questions_review/collecting/closed/reported), intake_summary (jsonb: goals, goals_were_documented boolean, what_changed, investments, concerns, decisions_pending, sensitive_areas), previous_retro_id (nullable), created_by, created_at

- retro_admins: id, retro_id, user_id, role (organizer/attribution_admin) — a user can hold one or both; attribution_admin gates the reveal flow

- organizer_intake_turns: id, retro_id, sequence, question_text, answer_text, answer_mode (text/voice), audio_url (nullable), created_at

- question_sets: id, retro_id, generated_probes (jsonb: question, spineArea, derivedFrom), organizer_edited_probes (jsonb), approved_at, approved_by

- participants: id, retro_id, name, email, role_at_event, invite_token (unique), status (not_started/in_progress/complete), completeness_score (numeric), low_completeness_flag (boolean), completed_at

- interview_turns: id, participant_id, sequence, spine_area, question_text, answer_text, answer_mode, audio_url (nullable), answer_quality (thin/adequate/rich/not_applicable), was_probe (boolean), probe_type (nullable), marked_sensitive (boolean), created_at

- retro_metrics: id, retro_id, label, value, prior_year_value (nullable), notes

- reports: id, retro_id, synthesis_json (includes sourceParticipantIds, never exposed in the shared view), generated_at, version

- action_items: id, retro_id, description, owner_name, due_date, status (open/done/dropped), carried_from_retro_id (nullable)

- attribution_access_log: id, retro_id, admin_user_id, target_type (finding/participant), target_id, reason_text, created_at

The fixed spine lives in application config, not the database, so it cannot be edited per retro by accident.

=====================

TECH NOTES

=====================

- Supabase for auth (organizers and admins only), database, and storage.

- Participants access interviews via unique token links, no account creation.

- Enforce the attribution gate with row-level security, not just UI hiding. The shared report endpoint must strip sourceParticipantIds server-side so attribution is never in the response payload for a non-admin request, and transcripts must not be readable without attribution_admin on that retro.

- Organizer intake transcripts must never be readable by the participant interview function. Pass only the approved question set and neutral retro context into participant interviews.

- Both interview flows run server-side in edge functions. The participant interview follows the INTERVIEW TURN LOGIC section above: assess, then act, with coverage and probe budget tracked in state between turns. The organizer intake uses the same assess-then-act pattern with the intake areas as its checklist.

- Voice: browser MediaRecorder captures audio, upload to storage, transcribe server-side (Whisper or equivalent), show transcript back for correction before submitting.

- Question generation, interview turns, and synthesis all enforce structured JSON output.

- Transactional email (Resend or similar) for invites and reminders. One reminder 24 hours before deadline to anyone unfinished.

- Nothing in the participant UI should ever display another participant's input, aggregate progress, or a partial summary.

NOT IN SCOPE FOR V1 (do not build, but do not block architecturally)

- Retro types other than event

- CRM, Slack, email, or calendar integrations

- Attributed reporting in the shared report view

- Cross-retro trend analysis and dashboards

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://debriefs.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/56d0aeb1-31f6-4092-9eb3-124a12d4ce02).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
