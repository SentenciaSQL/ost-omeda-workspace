export interface UserInfo {
  userId: string;
  databaseId: string;   // Omeda calls this "environmentId"
  profileId: string;
  permissions: string[];
  displayName?: string;
}
