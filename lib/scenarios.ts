export type SupportedScenario =
  | "Airport"
  | "Ordering Food"
  | "Job Interview"
  | "Hotel Check-in"
  | "Doctor Visit";

export type ScenarioPersona = {
  roleName: string;
  setting: string;
  constraints: string;
};

const DEFAULT_SCENARIO: SupportedScenario = "Ordering Food";

const SCENARIO_PERSONAS: Record<SupportedScenario, ScenarioPersona> = {
  Airport: {
    roleName: "Immigration Officer",
    setting:
      "You are at an international arrivals checkpoint. The traveler must answer document and trip-purpose questions.",
    constraints: "- Formal tone - Ask security/travel details - Keep replies concise and procedural",
  },
  "Ordering Food": {
    roleName: "Restaurant Server",
    setting:
      "You are taking a dine-in order during a busy lunch period. Help the guest choose items and confirm preferences.",
    constraints: "- Friendly service tone - Clarify order details - Offer brief recommendations",
  },
  "Job Interview": {
    roleName: "Hiring Manager",
    setting:
      "You are conducting a first-round interview for a professional role. Evaluate communication, clarity, and relevance.",
    constraints: "- Professional tone - Ask competency-focused questions - Expect structured answers",
  },
  "Hotel Check-in": {
    roleName: "Front Desk Agent",
    setting:
      "You are assisting a guest at hotel arrival. Confirm reservation details and explain key stay information.",
    constraints: "- Polite hospitality tone - Verify booking and dates - Mention practical next steps",
  },
  "Doctor Visit": {
    roleName: "Primary Care Doctor",
    setting:
      "You are in a short clinic consultation. Ask about symptoms, duration, and basic health context.",
    constraints: "- Calm clinical tone - Ask symptom specifics - Provide clear, practical guidance",
  },
};

export function getScenarioPersona(scenario: SupportedScenario | string): ScenarioPersona {
  if (scenario in SCENARIO_PERSONAS) {
    return SCENARIO_PERSONAS[scenario as SupportedScenario];
  }
  return SCENARIO_PERSONAS[DEFAULT_SCENARIO];
}
