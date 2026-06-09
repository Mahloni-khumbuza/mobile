export interface SystemSetting {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettingCreateRequest {
  key: string;
  value?: string;
  description?: string;
}

export interface SystemSettingUpdateRequest {
  value?: string;
  description?: string;
}
