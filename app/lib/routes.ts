export type AppRoute = {
  href: string;
  title: string;
  description: string;
};

export const appRoutes: AppRoute[] = [
  {
    href: "/",
    title: "Landing",
    description: "Entry page with app overview and quick navigation.",
  },
  {
    href: "/placement",
    title: "Placement",
    description: "Adaptive interview and AI-generated placement test.",
  },
  {
    href: "/mode-select",
    title: "Mode Select",
    description: "Choose your learning or interaction mode.",
  },
  {
    href: "/speak-mode",
    title: "Speak Sub-Mode",
    description: "Choose Conversation or Repeat before starting Speak chat.",
  },
  {
    href: "/scenario-select",
    title: "Scenario Select",
    description: "Legacy route that forwards to scenarios.",
  },
  {
    href: "/scenarios",
    title: "Scenarios",
    description: "Pick a scenario to launch the conversation.",
  },
  {
    href: "/chat",
    title: "Chat",
    description: "Main conversational experience.",
  },
  {
    href: "/vocab-quiz",
    title: "Vocab Quiz",
    description: "Placeholder route for upcoming vocabulary mini-games.",
  },
  {
    href: "/learning-videos",
    title: "Learning Videos",
    description: "Placeholder route for upcoming guided video lessons.",
  },
  {
    href: "/summary",
    title: "Summary",
    description: "Review mode, scenario, and completed exchanges.",
  },
];
