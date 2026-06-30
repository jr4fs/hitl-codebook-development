import type { Task } from "@common/types/tasks";
import type { AnnotationItem } from "@common/types/annotations";

export const demoTask: Task = {
  _id: "demo-task-1",
  name: "Youth Case Note Classification",
  description: "Classify the primary type of support interaction documented in youth homelessness case notes.",
  type: "Multiclass",
  labels: [
    { name: "crisis_intervention", definition: "Acute crisis requiring immediate response — mental health crisis, safety concerns, severe psychiatric symptoms", keywords: ["crisis", "distress", "psychosis", "safety", "paranoia", "agitated"] },
    { name: "service_coordination", definition: "Coordinating with external agencies, legal systems, healthcare providers, or community resources", keywords: ["referral", "court", "appointment", "resources", "outreach", "coordination"] },
    { name: "routine_support", definition: "Regular check-in or ongoing case management — emotional support, basic needs, follow-up", keywords: ["check-in", "overwhelmed", "follow up", "support", "update"] },
  ],
  labelColumn: "label",
  modelName: "claude-3-5-sonnet",
  columns: ["text_data"],
  file: "case_notes.csv",
  status: "ready",
  codebook: [
    "crisis_intervention: notes describing acute psychiatric symptoms, immediate safety threats, or emergency responses",
    "service_coordination: notes involving referrals to legal, medical, or community services and inter-agency collaboration",
    "routine_support: regular check-ins, ongoing emotional support, and basic needs assistance without crisis-level urgency",
  ],
  userID: "demo-user",
  createdAt: new Date().toISOString(),
};

const samples = [
  "HCM [PERSON] was alerted by staff that YP was presenting with high energy and making comments about machetes. HCM [PERSON] approached YP near the front desk who presented in good hygiene and was speaking in [PERSON] flight of ideas about being hurt by others. YP described being cut up into pieces by others and pointed toward his limbs [PERSON] if to show the injuries he had sustained. HCM [PERSON] engaged in [PERSON] risk assessment and YP referred to his attackers in ways that highlighted themes of paranoia.",
  "TCM WD approached YP after noticing YP in [PERSON] heated conversation with SHC HS. YP presented with very high energy and significant paranoia regarding staff. TCM [ORG] asked YP to explain what he needed in the moment but it was not immediately clear [PERSON] YP thought patterns were erratic and difficult to follow. YP kept repeating that he needed to see [PERSON] doctor but couldn't clarify whether it was for [PERSON] physical or mental health need.",
  "HCM [PERSON] reached out to Public Defender [PERSON] Choi (PDSC) for [PERSON] check-in phone call regarding the status of YP options. HCM [PERSON] learned from [ORG] that he has two options when appearing [PERSON] ODR Court: 1. Enrolling in the program (housing/mental health/physical health support would be provided) and likely that his felony would be expunged. or 2. Seeking [PERSON] conviction which would likely result in not having time served given his credits.",
  "from: Jesenya [PERSON] <[EMAIL]>  to: [PERSON] <[EMAIL]>  subject: Dental resources  \"Hey!! [PERSON] you're doing well :) Idk why [PERSON] have [PERSON] random [PERSON] that you were interested in dental resources... Is that right? Let me know and [PERSON] can forward u [PERSON] free dental resource coming up soon!! Thanks! Jesenya\"  from: [PERSON] <[EMAIL]>  to: Jesenya [PERSON] <[EMAIL]>  subject: Re: Dental resources  \"Yes, please!!\"",
  "YP called and identified feeling overwhelmed. YP reported that [PERSON] soon [PERSON] he recovered from [PERSON] cold/flu (not COVID) that prevented him from working for several days, he injured himself on his bike. According to YP, he rode over [PERSON] pothole. YP has been unable to work and has [PERSON] doctor's appointment on [DATE]. YP identified food insecurity and DOP agreed to drop off [PERSON] additional $50 in grocery store cards to support.",
  "SHC VP tapped on HCM [PERSON] for support with [PERSON] check in with YP. Although YP did not report any SI in the moment with SHC VP and TEC [PERSON], they still presented in [PERSON] emotional state and expressed concerns for escalation and conflict in their interactions with YP JG (though they were no longer in [PERSON] relationship). When HCM [PERSON] joined, YP was sharing about how YP JG snuck into their building last night and repeatedly banged on their door.",
];

const labels = ["crisis_intervention", "crisis_intervention", "service_coordination", "service_coordination", "routine_support", "routine_support"];

export const demoAnnotations: AnnotationItem[] = samples.map((text, idx) => {
  return {
    _id: `a${String(idx + 1)}`,
    taskId: "demo-task-1",
    sampleId: idx + 1,
    sampleContent: { text },
    labels: [labels[idx]],
    createdBy: "demo-user",
    source: "guide",
    aiAnnotation: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as AnnotationItem;
});
