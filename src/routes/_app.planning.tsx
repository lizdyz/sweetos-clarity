// /planning — guided 6-step Planning Workspace.
// Walks Mission → Journey → Quest → Quest detail → Tasks → Operators.
// All steps read/write existing tables. No DB changes.
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  PlanningStepper,
  type PlanningStep,
} from "@/components/planning/planning-stepper";
import { StepMission } from "@/components/planning/step-mission";
import { StepJourneys } from "@/components/planning/step-journeys";
import { StepQuests } from "@/components/planning/step-quests";
import { StepQuestDetail } from "@/components/planning/step-quest-detail";
import { StepTasks } from "@/components/planning/step-tasks";
import { StepOperators } from "@/components/planning/step-operators";

export const Route = createFileRoute("/_app/planning")({
  component: PlanningPage,
});

const STEPS: PlanningStep[] = [
  { key: "mission", label: "Mission", hint: "Long-term WHY" },
  { key: "journeys", label: "Journeys", hint: "Capability arcs" },
  { key: "quests", label: "Quests", hint: "Themed work" },
  { key: "detail", label: "Flesh out", hint: "JTBD · Comp · Proj · Decisions" },
  { key: "tasks", label: "Tasks", hint: "Atomic units" },
  { key: "operators", label: "Operators", hint: "Who does the work" },
];

function PlanningPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState<string>("mission");
  const [visited, setVisited] = useState<Set<string>>(new Set(["mission"]));

  const [missionId, setMissionId] = useState<string | null>(null);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [questId, setQuestId] = useState<string | null>(null);

  const goto = (key: string) => {
    setCurrent(key);
    setVisited((s) => {
      const next = new Set(s);
      next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4 px-6 pt-5 pb-10">
      <PageHeader
        title="Planning"
        icon={<Compass className="h-5 w-5" />}
        purpose="Seed and align your Mission · Journeys · Quests · Projects · Tasks. Top-down, one screen at a time."
        whatYouCanDo={[
          "Confirm or write the Mission",
          "Pick which Journeys are active under the Mission",
          "Add Quests under each Journey",
          "Flesh out a Quest with JTBDs, Components, Projects, Decisions",
          "Break a Project into operator-assignable Tasks",
        ]}
        connectsTo={[
          { to: "/missions", label: "Missions" },
          { to: "/journeys", label: "Journeys" },
          { to: "/quests", label: "Quests" },
          { to: "/today", label: "Today" },
        ]}
        nextSteps={["Open Today to see what's next"]}
      />

      <PlanningStepper
        steps={STEPS}
        current={current}
        visited={visited}
        onSelect={goto}
      />

      <div className="rounded-2xl border border-border bg-background/40 p-4">
        {current === "mission" && (
          <StepMission
            selectedId={missionId}
            onSelect={setMissionId}
            onNext={() => goto("journeys")}
          />
        )}
        {current === "journeys" && (
          <StepJourneys
            missionId={missionId}
            selectedId={journeyId}
            onSelect={setJourneyId}
            onNext={() => goto("quests")}
            onBack={() => goto("mission")}
          />
        )}
        {current === "quests" && (
          <StepQuests
            journeyId={journeyId}
            selectedId={questId}
            onSelect={setQuestId}
            onNext={() => goto("detail")}
            onBack={() => goto("journeys")}
          />
        )}
        {current === "detail" && (
          <StepQuestDetail
            questId={questId}
            onBack={() => goto("quests")}
            onNext={() => goto("tasks")}
          />
        )}
        {current === "tasks" && (
          <StepTasks
            questId={questId}
            onBack={() => goto("detail")}
            onNext={() => goto("operators")}
          />
        )}
        {current === "operators" && (
          <StepOperators
            onBack={() => goto("tasks")}
            onDone={() => navigate({ to: "/today" })}
          />
        )}
      </div>
    </div>
  );
}
