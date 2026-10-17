export interface Skill {
  id: string;
  name: string;
  type: 'existing' | 'gap';
  category: string;
  yearsOfExperience?: number;
  proficiency: number; // 0 - 100
  description: string;
  relevanceToTarget: string;
  transferWeight: number; // e.g. 0.85
  iconName?: string;
}

export interface LearningStep {
  id: string;
  stepNumber: number;
  title: string;
  estimatedTime: string;
  description: string;
  practicalExercise: string;
  leveragesExistingSkill: string;
  completed: boolean;
}

export interface SkillGapModule {
  id: string;
  skillName: string;
  whyItMatters: string;
  bridgeTimeframe: string;
  steps: LearningStep[];
}

export interface CandidateProfile {
  id: string;
  name: string;
  age: number;
  location: string;
  experienceYears: number;
  currentRole: string;
  targetRole: string;
  matchScore: number;
  salaryTrajectory: {
    currentAvg: string;
    targetAvg: string;
  };
  domainSpecialization: string;
  storyQuote: string;
  existingSkills: Skill[];
  skillGaps: Skill[];
  learningModules: SkillGapModule[];
}

export interface AgentStage {
  id: number;
  name: string;
  tagline: string;
  description: string;
  actionOutput: string;
  humanOversightNote: string;
  iconName: string;
  badge: string;
}
