# One-question interview flow

## Goal
Make the participant interview feel focused and finite: one question is visible at a time, submitting an answer replaces it with the next question on the same link, and progress remains easy to see.

## Participant experience
- Keep the existing welcome and confidentiality screen before the interview begins.
- Once started, show only the current question, its answer box, voice control, and one clear **Submit answer** action.
- After submission, hold the current screen in a brief “Preparing the next question…” state, then replace it with the next question automatically. There will be no separate “Next question” step and no scrolling conversation history.
- Use a restrained fade/slide transition between questions, with reduced-motion support.
- Keep the desktop progress line and persistent mobile bottom gauge. Progress will continue to use sections and estimated minutes because adaptive follow-up questions mean an exact remaining-question count cannot be promised accurately.
- Preserve the existing completion screen and save/resume behavior; returning through the same link opens directly on the current unanswered question.

## Review previous answers
- Add a quiet **Review previous answers** control below the current question.
- Open a separate review panel listing previously submitted questions and answers without exposing future questions or anyone else’s responses.
- Allow a respondent to edit and save an earlier answer before completing the interview.
- Saving an edit updates the stored transcript used in the final report. It will not rewrite questions already asked later in the conversation.
- Keep this review secondary so it does not reintroduce distraction into the main interview.

## Technical details
- Refactor the participant interview page to render only the latest unanswered turn rather than mapping the full transcript.
- Add a token-authorized server action that validates ownership through the private interview link and updates only an answered turn belonging to that participant.
- Update the local interview data after each submission so the next question appears smoothly while retaining server-backed persistence.
- Stop active speech recognition when a question changes or its answer control unmounts.
- Add accessible loading, disabled, focus, and error states for submitting and editing answers.
- No URL, database schema, admin workflow, question-generation rules, or report logic changes are required.

## Validation
- Test starting, answering, adaptive follow-ups, refreshing/resuming, reviewing and editing prior answers, voice-answer cleanup, completion, and invalid links.
- Check phone and desktop layouts, including the fixed mobile progress gauge and reduced-motion behavior.
