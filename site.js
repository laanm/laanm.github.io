const stageCopy = {
  detect: {
    kicker: 'STAGE 01 / DETECTION',
    title: 'Find candidate cuts',
    description: 'FFmpeg proposes possible clip boundaries. Each candidate stays reviewable before any downstream decision.',
    pill: 'Candidate scan',
    outcome: 'A possible scene transition is ready for verification.',
    badge: 'Queued',
  },
  verify: {
    kicker: 'STAGE 02 / VERIFICATION',
    title: 'Check the boundary',
    description: 'Gemini is the default reference for comparing frames around a candidate cut. A local PyTorch classifier is being explored as an experimental alternative.',
    pill: 'Model decision',
    outcome: 'Synthetic example: the two sides appear to belong to different clips.',
    badge: 'Separate',
  },
  review: {
    kicker: 'STAGE 03 / HUMAN REVIEW',
    title: 'Keep a person in control',
    description: 'Uncertain candidates can be corrected by a reviewer. Feedback is recorded for later evaluation rather than changing model weights immediately.',
    pill: 'Review queue',
    outcome: 'This synthetic candidate is awaiting a human decision.',
    badge: 'Needs review',
  },
  compose: {
    kicker: 'STAGE 04 / COMPOSITION',
    title: 'Turn clips into a plan',
    description: 'A multimodal LLM proposes a structured ranking, text, and sound choices. Project rules validate the result before a separate render step.',
    pill: 'Structured output',
    outcome: 'A sample five-clip plan is ready for validation.',
    badge: 'Plan ready',
  },
};

const stageButtons = [...document.querySelectorAll('[data-stage]')];
const stageElements = {
  kicker: document.getElementById('stage-kicker'),
  title: document.getElementById('stage-title'),
  description: document.getElementById('stage-description'),
  pill: document.getElementById('stage-pill'),
  outcome: document.getElementById('stage-outcome'),
  badge: document.getElementById('decision-badge'),
  reviewControls: document.getElementById('review-controls'),
  reviewFeedback: document.getElementById('review-feedback'),
};

function showStage(stage) {
  const copy = stageCopy[stage];
  if (!copy) return;
  stageElements.kicker.textContent = copy.kicker;
  stageElements.title.textContent = copy.title;
  stageElements.description.textContent = copy.description;
  stageElements.pill.textContent = copy.pill;
  stageElements.outcome.textContent = copy.outcome;
  stageElements.badge.textContent = copy.badge;
  stageElements.reviewControls.hidden = stage !== 'review';
  stageElements.reviewFeedback.textContent = 'Choose a decision to see how feedback is recorded in this simulation.';
  stageButtons.forEach((button) => {
    const active = button.dataset.stage === stage;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

stageButtons.forEach((button) => button.addEventListener('click', () => showStage(button.dataset.stage)));
document.querySelectorAll('[data-decision]').forEach((button) => {
  button.addEventListener('click', () => {
    const separate = button.dataset.decision === 'separate';
    stageElements.badge.textContent = separate ? 'Separate' : 'Merge';
    stageElements.reviewFeedback.textContent = separate
      ? 'Demo feedback: keep these as separate clips. No real job was changed.'
      : 'Demo feedback: merge these into one clip. No real job was changed.';
  });
});
