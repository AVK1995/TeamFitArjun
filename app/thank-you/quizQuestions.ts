export interface QuizQuestion {
  step: number;
  name: string;
  question: string;
  sub?: string;
  required: boolean;
  multi?: boolean;
  options: { value: string; label: string }[];
}

/** Exact 10-question diagnostic — copy preserved from source HTML. */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    step: 1,
    name: "body_snapshot",
    question:
      "What is your current weight, and roughly how much fat loss are you targeting?",
    sub: "Pick the closest range — we'll refine on the call.",
    required: true,
    options: [
      { value: "Lose 5-10 kg", label: "Lose 5–10 kg" },
      { value: "Lose 10-20 kg", label: "Lose 10–20 kg" },
      { value: "Lose 20+ kg", label: "Lose 20+ kg" },
      {
        value: "Body composition only",
        label: "Weight is fine, I want body composition and conditioning",
      },
    ],
  },
  {
    step: 2,
    name: "training_history",
    question: "How long have you been going to the gym or doing any formal training?",
    sub: "Be honest — this helps Arjun calibrate the call.",
    required: true,
    options: [
      { value: "Never properly started", label: "Never properly started" },
      { value: "Less than 1 year, on and off", label: "Less than 1 year, on and off" },
      {
        value: "1-3 years, sometimes consistent",
        label: "1–3 years, sometimes consistent, sometimes not",
      },
      {
        value: "3+ years, regular but stuck",
        label: "3+ years, regular but results are stuck",
      },
    ],
  },
  {
    step: 3,
    name: "tried",
    question: "What have you tried in the last 2 years?",
    sub: "Tick everything that applies.",
    required: true,
    multi: true,
    options: [
      { value: "Gym membership", label: "Gym membership" },
      { value: "Personal trainer at a gym", label: "Personal trainer at a gym" },
      {
        value: "Online coach or coaching program",
        label: "Online coach or coaching program",
      },
      {
        value: "Specific diet",
        label: "Specific diet (keto, intermittent fasting, high protein, etc.)",
      },
      { value: "Workout app or PDF plan", label: "Workout app or PDF plan" },
      { value: "Supplements or fat burners", label: "Supplements or fat burners" },
      { value: "Self-research and YouTube", label: "Self-research and YouTube" },
      {
        value: "Nothing, never properly started",
        label: "Nothing, never properly started",
      },
    ],
  },
  {
    step: 4,
    name: "work_pattern",
    question: "What does your actual work schedule look like?",
    sub: "Pick the one that matches a normal week best.",
    required: true,
    options: [
      {
        value: "Desk job, 9-7 fixed",
        label: "Desk job, 9–7 fixed, mostly office and home",
      },
      {
        value: "Long office hours, irregular",
        label: "Long office hours, late nights, irregular timing",
      },
      {
        value: "Travel-heavy",
        label: "Travel-heavy, 2+ trips a month, hotels and flights",
      },
      {
        value: "Business owner, chaotic",
        label: "Business owner, I manage my own schedule but it is chaotic",
      },
      { value: "Shift work or night shifts", label: "Shift work or night shifts" },
    ],
  },
  {
    step: 5,
    name: "travel",
    question: "How often do you typically travel?",
    sub: "Hotels and flights need a different system.",
    required: true,
    options: [
      { value: "Almost never", label: "Almost never, mostly based at home" },
      { value: "1-2 times a month", label: "1–2 times a month, mostly short trips" },
      { value: "3+ times a month", label: "3+ times a month, hotel stays are regular" },
      {
        value: "NRI, India and abroad",
        label: "NRI, travel between India and abroad regularly",
      },
    ],
  },
  {
    step: 6,
    name: "food_situation",
    question: "What does your food setup look like?",
    sub: "Real life, not the ideal version.",
    required: true,
    options: [
      { value: "Mostly home-cooked", label: "Mostly home-cooked, eating out occasionally" },
      {
        value: "Mix of home and outside",
        label: "Mix of home and outside, roughly half and half",
      },
      {
        value: "Mostly eating out",
        label: "Mostly eating out, restaurant and delivery dependent",
      },
      { value: "Hostel, PG, or mess food", label: "Hostel, PG, or mess food" },
      { value: "NRI setup, different food access", label: "NRI setup, different food access" },
    ],
  },
  {
    step: 7,
    name: "diet_preference",
    question: "What is your diet preference?",
    required: true,
    options: [
      { value: "Non-veg", label: "Non-veg (chicken, eggs, fish, all fine)" },
      { value: "Eggetarian", label: "Eggetarian (eggs yes, meat no)" },
      { value: "Vegetarian", label: "Vegetarian (dairy yes, meat and eggs no)" },
      { value: "Vegan or other restrictions", label: "Vegan or other specific restrictions" },
      {
        value: "Jain or religious restrictions",
        label: "Jain or religious dietary restrictions",
      },
    ],
  },
  {
    step: 8,
    name: "sleep_stress",
    question: "In a typical week, how would you describe your sleep and stress?",
    required: true,
    options: [
      { value: "7+ hours, manageable", label: "7+ hours of sleep, stress is manageable" },
      {
        value: "6-7 hours, regular work stress",
        label: "6–7 hours of sleep, work stress is a regular thing",
      },
      {
        value: "5-6 hours, high pressure",
        label: "5–6 hours of sleep, deadlines and high-pressure phases are common",
      },
      {
        value: "Inconsistent week to week",
        label: "Inconsistent, some weeks are fine, others fall apart completely",
      },
    ],
  },
  {
    step: 9,
    name: "biggest_constraint",
    question: "Honestly, what breaks your fitness consistency the most?",
    sub: "The “chhod yaar” moment — what triggers it for you?",
    required: true,
    options: [
      {
        value: "Travel and irregular timing",
        label: "Travel, hotel food, restaurant dinners, irregular timing",
      },
      {
        value: "Office stress and late hours",
        label: "Office stress and late hours, meals get skipped, heavy dinner at night",
      },
      {
        value: "Social weekends",
        label: "Social weekends, friends, family, eating out, drinking",
      },
      { value: "Gym time inconsistent", label: "Gym time just does not happen consistently" },
      {
        value: "Plan boring, motivation drops",
        label: "Following a plan gets boring and motivation drops",
      },
      {
        value: "Physical issues",
        label: "Physical issues like back pain, knee problems, slip disc, etc.",
      },
    ],
  },
  {
    step: 10,
    name: "location",
    question: "Where are you based?",
    required: true,
    options: [
      {
        value: "India Tier 1",
        label: "India, Tier 1 (Mumbai, Delhi, Bangalore, Hyderabad, Pune, Chennai, Kolkata)",
      },
      {
        value: "India Tier 2",
        label: "India, Tier 2 (Nagpur, Chandigarh, Indore, Jaipur, etc.)",
      },
      {
        value: "India Tier 3",
        label: "India, Tier 3 (Gandhinagar, Bhatinda, Jhansi, Udaipur, etc.)",
      },
      { value: "NRI US/Canada", label: "NRI, US or Canada" },
      { value: "NRI UAE/Middle East", label: "NRI, UAE or Middle East" },
      {
        value: "NRI UK/Europe/Australia/Other",
        label: "NRI, UK, Europe, Australia, or other",
      },
    ],
  },
];
