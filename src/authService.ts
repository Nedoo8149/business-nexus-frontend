import API from './api';

export const loginUser = async (formData: any) => {
  const response = await API.post('/auth/login', formData);
  return response.data;
};

export const registerUser = async (formData: any) => {
  const response = await API.post('/auth/register', formData);
  return response.data;
};

// YEH MISSING THA: OTP Verify karne ki API
export const verifyOTPUser = async (data: { userId: string, otp: string }) => {
  const response = await API.post('/auth/verify-otp', data);
  return response.data;
};

export const getProfile = async () => {
  const response = await API.get('/profile');
  return response.data;
};

export const updateProfile = async (profileData: any) => {
  const response = await API.put('/profile', profileData);
  return response.data;
};

// ==========================================
// Meetings ki APIs
// ==========================================
export const scheduleMeeting = async (meetingData: any) => {
  const response = await API.post('/meetings/schedule', meetingData);
  return response.data;
};

export const getMeetings = async () => {
  const response = await API.get('/meetings');
  return response.data;
};

export const acceptMeeting = async (id: string) => {
  const response = await API.put(`/meetings/${id}/accept`);
  return response.data;
};

export const rejectMeeting = async (id: string) => {
  const response = await API.put(`/meetings/${id}/reject`);
  return response.data;
};