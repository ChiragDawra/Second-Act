import React from 'react';
import {
  FileCheck,
  AlertCircle,
  Landmark,
  Layers,
  Code2,
  GitBranch,
  ShieldCheck,
  FileText,
  Table,
  Users,
  Database,
  CheckCheck,
  Compass,
  TrendingUp,
  GitFork,
  Sparkles,
  ArrowRight,
  ArrowDown,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Info,
  ExternalLink,
  Award,
  Play,
  Clock,
  BookOpen,
  User,
  MapPin,
  Briefcase,
  LucideProps
} from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, ...props }) => {
  switch (name) {
    case 'FileCheck': return <FileCheck {...props} />;
    case 'AlertCircle': return <AlertCircle {...props} />;
    case 'Landmark': return <Landmark {...props} />;
    case 'Layers': return <Layers {...props} />;
    case 'Code2': return <Code2 {...props} />;
    case 'GitBranch': return <GitBranch {...props} />;
    case 'ShieldCheck': return <ShieldCheck {...props} />;
    case 'FileText': return <FileText {...props} />;
    case 'Table': return <Table {...props} />;
    case 'Users': return <Users {...props} />;
    case 'Database': return <Database {...props} />;
    case 'CheckCheck': return <CheckCheck {...props} />;
    case 'Compass': return <Compass {...props} />;
    case 'TrendingUp': return <TrendingUp {...props} />;
    case 'GitFork': return <GitFork {...props} />;
    case 'Sparkles': return <Sparkles {...props} />;
    case 'ArrowRight': return <ArrowRight {...props} />;
    case 'ArrowDown': return <ArrowDown {...props} />;
    case 'Check': return <Check {...props} />;
    case 'ChevronDown': return <ChevronDown {...props} />;
    case 'ChevronUp': return <ChevronUp {...props} />;
    case 'RotateCcw': return <RotateCcw {...props} />;
    case 'Info': return <Info {...props} />;
    case 'ExternalLink': return <ExternalLink {...props} />;
    case 'Award': return <Award {...props} />;
    case 'Play': return <Play {...props} />;
    case 'Clock': return <Clock {...props} />;
    case 'BookOpen': return <BookOpen {...props} />;
    case 'User': return <User {...props} />;
    case 'MapPin': return <MapPin {...props} />;
    case 'Briefcase': return <Briefcase {...props} />;
    default: return <FileCheck {...props} />;
  }
};
