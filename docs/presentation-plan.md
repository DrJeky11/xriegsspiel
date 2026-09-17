# MCU–NPS hackathon presentation discussion

**Recorded 2026-09-16. Status: discussion draft, not an approved deck or script.**

## Confirmed by the owner

- Ten minutes total: seven minutes for the brief and three minutes for questions.
- The owner is considering PowerPoint with screen captures and plans to make a video.
- This task is to discuss what to present and how to present it. The slide sequence, video length and closing request below are proposals.

## Event research

The official event page identifies the **MCU–NPS AI Learning Initiatives Hackathon**, 15–18 September 2026, at MCU in Quantico and NPS in Monterey. Its stated purpose concerns Marine Corps training and education modernization. [H01, event description]

MARADMIN 350/26 lists personalized learning, simulation and virtual training, performance assessment, content generation, operational support and wargaming. Its wargaming objective explicitly includes evaluating learning and decision-making. It schedules final presentations and judging for 18 September. The announcement's original Marines.mil article returned HTTP 403 during this research; its text was read through the reproduction listed in H02. [H02, paragraphs 4.a.1–4.a.6 and 4.b.3]

DefenseScoop reported that a predetermined judging rubric would be supplied to participants through the event portal. This research did not retrieve that rubric. The owner has been asked whether the organizers supplied it. Do not substitute an invented scoring system. The seven/three-minute split comes from the owner, not the public sources. [H03, spokesperson discussion of judging]

**Presentation inference:** emphasize the learner's decision and the evidence available for teaching. Show the immersive interface as part of that experience. This is a recommendation based on the event objectives, not a verified judging preference.

## Proposed central message

XRiegsspiel gives learners a place to practice military decisions, receive guidance, and review the evidence behind the outcome.

The problem comes from the [owner's requirements](product-requirements.md): learning mechanics, checking rules and maintaining records consume attention that should be available for reasoning and discussion. Reduced instructor burden and improved learning remain hypotheses to measure.

Use **Second Thomas Resupply** as a single demonstration thread because its current implementation connects geographic play, opposition, the Sensei pilot and scenario decision records. It is an authored educational adaptation. Blue represents the Philippines in this scenario. The catalog's US/China labels do not describe every scenario's actors. See the [current opponent guide](ai-opponent.md) for geographic behavior; older sector descriptions are historical design material.

## Proposed seven-slide brief

| Time | Subject | Visual evidence and speaking purpose |
| --- | --- | --- |
| 0:00–0:40 | The learning problem | Strong tabletop screenshot with the title. Introduce the learner and the friction described above. |
| 0:40–1:20 | The practice experience | Quest and browser captures. Explain the mission, opposition, available guidance and review in plain language. |
| 1:20–2:50 | One decision in the exercise | A 90-second recording, narrated live, showing a mission, a choice, an order and its actual consequence. Include a short teaching-hint moment. |
| 2:50–3:50 | The decision record | A readable scenario-review capture showing the earlier player view, submitted order, result and reflection. Explain why preserving this context helps an instructor discuss the decision. |
| 3:50–4:55 | The AI in the prototype | Show one real Sensei hint. Distinguish authored opponent planning/search from the trained teaching-topic selector. Explain the broader teaching vision as future work. |
| 4:55–5:45 | Current evidence and limits | Summarize existing implementation and recorded checks. State that learning benefit and broader headset usability still need human evaluation. |
| 5:45–6:40 | Proposed next step | Request an instructor-supported pilot. Measure time to a first valid decision, instructor interventions and ability to explain and transfer the lesson. No numerical improvement is claimed. |

This allocates 400 seconds and leaves 20 seconds of margin inside the seven-minute brief. Keep the closing slide visible during the three-minute question period.

## Proposed video and captures

Capture one real sequence from the same run. Rehearse it before recording and retain the corresponding decision record. Do not combine an order from one run with a result from another as if continuous.

- 0–10 seconds: steady view of a person using Quest or the headset tabletop to establish the spatial interaction.
- 10–25 seconds: mission and objective, with readable browser capture if headset text is too small.
- 25–50 seconds: a route/action choice and a teaching hint that explains the applicable rule.
- 50–70 seconds: submit the order and show the actual opponent response or resolved consequence.
- 70–90 seconds: inspect the explanation and the decision record used for reflection.

Use large crops and short captions. Cut loading, navigation and repetitive rounds. Label any jump forward. Narrate what the learner is deciding and what the result means. Keep source recordings so the owner can make a longer standalone video later.

Embed the short clip locally in the eventual deck and retain still frames that let the same explanation continue if playback fails. Exact embedding/export compatibility should be checked in the presentation software used at the event. Rehearse the whole brief to about 6:40 including playback.

## Claims supported by the project records

- **Implemented and documented:** Pacific/CENTCOM play, eight authored AI scenarios, three opponent planning budgets, retained decisions and historical views, referee controls, and an optional Sensei pilot. The [opponent guide](ai-opponent.md), [exercise database guide](exercise-database.md) and [training record](training/guided-policy-v1.md) describe the evidence and scope.
- **Recorded physical Quest evidence:** owner trials include MR entry, tabletop/menu use and captured piece movement, plus a partial AI match. These are narrower than a complete headset acceptance test.
- **Actual machine learning:** a compact supervised model selects among teaching topics for Second Thomas Resupply. Authored rules/events provide its explanation text. Training uses synthetic examples. The model's 98.09% agreement with authored labels is not a student-learning score or evidence of superiority over the authored teacher.
- **Remaining evaluation:** instructor review, learning transfer, scenario balance, difficulty calibration, sustained headset comfort/performance and broader mixed-device use. Do not claim validated combat prediction, expert opposition or institutional deployment.

These are references to prior recorded checks. This presentation-planning task did not run the application, record new footage or repeat software/headset tests.

## Question preparation

Keep optional backup material for the distinction between opponent and tutor, the reason for offering XR alongside browser access, original rules and source limitations, deployment requirements, and the proposed pilot measurements. Describe human referee authority separately from automated adjudication and teaching hints.

The main brief can mention the eight scenarios as breadth. Catalog counts, the complete map gallery, stack details and model metrics can support questions without occupying the central demonstration.

## Sources

Accessed **2026-09-16, America/New_York**.

- **H01:** [MCeLE official event page](https://cqpub.mcele.usmc.mil/content/adobeconnect/0/7/en/events/event/private/65079/78374696/event_landing.html), September 15–18 event description. Its later September 21–24 workshop is a separate event and its submission language is not the hackathon judging rubric.
- **H02:** [MARADMIN 350/26 original announcement](https://www.marines.mil/News/Messages/Messages-Display/Article/4560480/announcement-of-the-joint-mcu-nps-ai-learning-initiatives-hackathon/), published 31 July 2026, especially paragraphs 2–4 and 5.b–5.c. Original article fetch returned 403. Read the [reproduced announcement](https://corpsguide.com/maradmin/350-26/announcement-of-the-joint-mcu-nps-ai-learning-initiatives-hackathon); the [official MARADMIN index](https://www.marines.mil/News/Messages/MARADMINS/Search/nps/) independently lists its title, number and publication date.
- **H03:** [DefenseScoop, Marine Corps will hold AI ‘hackathon’ to prototype tools for training, education](https://defensescoop.com/2026/08/06/marine-corps-ai-hackathon-training-education/), Drew F. Lawrence, 6 August 2026, paragraphs reporting spokesperson statements about the rubric and judging panel. Secondary reporting, not the rubric itself.
