import api from './api';
import axios from 'axios';
import { config } from '../config/env';
import type { ComplaintCreateDto, ComplaintDto, ComplaintStatusUpdateDto } from '@/types/complaint.types';

const COMPLAINTS_API = '/complaints';

export const complaintService = {
  // Create a new complaint with up to 5 files
  createComplaint: async (data: ComplaintCreateDto, files: File[]): Promise<ComplaintDto> => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    
    if (files && files.length > 0) {
      if (files.length > 5) throw new Error('Maximum 5 files allowed.');
      files.forEach((file) => {
        formData.append('files', file);
      });
    }

    const token = localStorage.getItem(config.tokenKey);
    const response = await axios.post<ComplaintDto>(`${config.apiBaseUrl}/v1${COMPLAINTS_API}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Get all complaints for the currently authenticated user (volunteer or other)
  getMyComplaints: async (): Promise<ComplaintDto[]> => {
    const response = await api.get<ComplaintDto[]>(`${COMPLAINTS_API}/my-complaints`);
    return response.data;
  },

  // Get all complaints for a specific committee (for committee officials)
  getComplaintsByCommittee: async (committeeId: string): Promise<ComplaintDto[]> => {
    const response = await api.get<ComplaintDto[]>(`${COMPLAINTS_API}/committee/${committeeId}`);
    return response.data;
  },

  // Get all complaints across the system (strictly for National President)
  getAllComplaints: async (): Promise<ComplaintDto[]> => {
    const response = await api.get<ComplaintDto[]>(`${COMPLAINTS_API}/all`);
    return response.data;
  },

  // Update complaint status (with optional immediate response message)
  updateStatus: async (complaintId: string, payload: ComplaintStatusUpdateDto): Promise<ComplaintDto> => {
    const response = await api.put<ComplaintDto>(`${COMPLAINTS_API}/${complaintId}/status`, payload);
    return response.data;
  },

  // Add an official response to the complaint
  addResponse: async (complaintId: string, message: string): Promise<ComplaintDto> => {
    const response = await api.post<ComplaintDto>(`${COMPLAINTS_API}/${complaintId}/responses`, { message });
    return response.data;
  },
};

export default complaintService;
