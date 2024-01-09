export interface DbUserDoc {
  seen: boolean;
  comment: string;
}
export interface DbUser {
  rate: number;
  comment: string;
  docs: Record<string, DbUserDoc>;
}
export type DbUserName = DbUser & { name: string };

export type ResInfo = Record<string, DbUserName>;

export function cmp<T extends number | string>(l: T, r: T) {
  return l < r ? -1 : l > r ? +1 : 0;
}
