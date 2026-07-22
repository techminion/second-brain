export interface Profile {
  createdAt: string;
  displayName: string | null;
  email: string;
  id: string;
}

export interface ProfileRecord {
  createdAt: string;
  displayName: string | null;
  id: string;
}

export interface UpdateProfileInput {
  displayName?: string;
}

export interface VerifiedProfileIdentity {
  email: string;
  id: string;
}
