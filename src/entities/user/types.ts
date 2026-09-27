export type Role = 'specialist' | 'teamlead' | 'super_admin';

export type Capability =
  | 'projects.read'
  | 'projects.reassign'
  | 'projects.accept'
  | 'finance.read'
  | 'prompts.read'
  | 'prompts.publish'
  | 'monitoring.read';

// /me — єдине джерело для меню й завантаження модулів (А-3).
export interface Me {
  id: string;
  name: string;
  role: Role;
  teamId: string | null;
  capabilities: Capability[];
}
