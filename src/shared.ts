export interface DbUserDoc {
    seen: boolean; // Whether the document has been reviewed
    comment: string; // Comment for the document
    paths: string[]; // Array of file paths
}

export interface DbUser {
    rate: number; // Rating for the user (-1, 0, 1)
    comment: string; // General comment for the user
    docs: Record<string, DbUserDoc>; // Documents associated with the user
    firstName: string; // First name of the user
    lastName: string; // Last name of the user
    email: string; // Email of the user
    cv: string; // Path or link to the CV file
    motivationalLetter: string; // Path or link to the motivational letter
    recommendationLetter: string; // Path or link to the recommendation letter
    transcript: string; // Path or link to the transcript
    almostAStudent: string; // Path or link to the "Almost A" student document
}

export type DbUserName = DbUser & { name: string }; // Extends DbUser with a name field

export type ResInfo = Record<string, DbUserName>; // A record of users indexed by their ID

/**
 * A utility function to compare two values.
 * @param l - The left value to compare.
 * @param r - The right value to compare.
 * @returns -1 if l < r, +1 if l > r, 0 if l == r.
 */
export function cmp<T extends number | string>(l: T, r: T) {
    return l < r ? -1 : l > r ? +1 : 0;
}