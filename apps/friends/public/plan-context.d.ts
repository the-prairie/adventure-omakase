export interface PlanTerms {
  title: string;
  region: string;
  area: string;
  date: string;
  start: string | null;
  end: string | null;
  meeting: string | null;
  part: string | null;
  kind: string;
  joinStyle: string;
  catalogueId: string | null;
  cost: string | null;
  costLimit: number | null;
  booking: string;
  capacity: number | null;
  effort: string;
  mapLink: string | null;
}
export interface PlanPerspective {
  participation: 'solo' | 'meet-afterward' | 'open';
  participationLabel: string;
  response: string;
  responseLabel: string;
  acceptedRevision: number | null;
  needsReconfirmation: boolean;
  current: PlanTerms;
  accepted: PlanTerms | null;
  changes: {
    field: keyof PlanTerms;
    before: string | number | null;
    after: string | number | null;
  }[];
  notesChanged: boolean;
  options: {
    id: string;
    label: string;
    start: string;
    end: string;
    meeting: string;
  }[];
  scheduleHold: 'tentative' | 'needs-reconfirmation' | 'committed' | null;
  missingPart: boolean;
  full: boolean;
  joinedCount: number;
  responses: {
    memberId: string;
    status: string;
    label: string;
    choice: string | null;
    needsReconfirmation: boolean;
  }[];
  actions: string[];
}
declare global {
  var OmakasePlanContext: {
    project(plan: Record<string, unknown>, memberId: string): PlanPerspective;
    terms(plan: Record<string, unknown>, choice?: string): PlanTerms;
    labels: Readonly<Record<string, string>>;
  };
}
