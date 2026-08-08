import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../config/supabase';

export interface Cell {
  id: string;
  name: string;
  leaderName: string;
  password?: string;
  custom_questions?: string[];
  custom_stop_words?: string[];
}

export interface Member {
  id: string;
  cellId: string;
  name: string;
  phone: string;
  type: 'M' | 'V';
}

export interface Meeting {
  id: string;
  cellId: string;
  date: string;
  attendees: string[];
  salvations?: number;
  welfare?: number;
}

export interface WeeklyReportData {
  id: string;
  cellId: string;
  date: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  custom_responses?: Record<string, string>;
  timestamp: string;
}

export interface AppData {
  cells: Cell[];
  adminPassword?: string;
  roster: Member[];
  meetings: Meeting[];
  weeklyReports: WeeklyReportData[];
}

export interface CurrentUser {
  role: 'admin' | 'leader';
  cellId?: string | null;
}

interface DataContextType {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  currentUser: CurrentUser | null;
  login: (role: 'admin' | 'leader', password: string, cellId?: string | null) => boolean;
  logout: () => void;
  activeCellId: string | null;
  setActiveCellId: React.Dispatch<React.SetStateAction<string | null>>;
  updateMemberStatus: (memberId: string, newType: 'M' | 'V') => Promise<void>;
  addVisitor: (cellId: string, name: string, phone: string) => Promise<Member>;
  addMember: (cellId: string, name: string, phone: string) => Promise<Member>;
  saveMeeting: (meeting: Meeting) => Promise<void>;
  saveWeeklyReport: (report: WeeklyReportData) => Promise<void>;
  createCell: (name: string, leaderName: string, password?: string) => Promise<void>;
  updateCellPassword: (cellId: string, newPassword: string) => Promise<void>;
  updateCellQuestions: (cellId: string, questions: string[]) => Promise<void>;
  updateCellStopWords: (cellId: string, words: string[]) => Promise<void>;
  updateAdminPassword: (newPassword: string) => Promise<void>;
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const defaultData: AppData = {
  cells: [],
  adminPassword: '123',
  roster: [],
  meetings: [],
  weeklyReports: []
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<AppData>(defaultData);
  const [loading, setLoading] = useState(true);
  
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem('church-cell-current-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeCellId, setActiveCellId] = useState<string | null>(() => {
    return localStorage.getItem('church-cell-active-id');
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('church-cell-current-user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('church-cell-current-user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeCellId) {
      localStorage.setItem('church-cell-active-id', activeCellId);
    } else {
      localStorage.removeItem('church-cell-active-id');
    }
  }, [activeCellId]);

  // Realtime Database Listeners
  useEffect(() => {
    const fetchData = async () => {
      const [cellsRes, rosterRes, meetingsRes, reportsRes, settingsRes] = await Promise.all([
        supabase.from('cells').select('*'),
        supabase.from('roster').select('*'),
        supabase.from('meetings').select('*'),
        supabase.from('weeklyreports').select('*'),
        supabase.from('settings').select('*')
      ]);

      setData({
        cells: cellsRes.data?.map((c: any) => ({ ...c, leaderName: c.leadername, custom_questions: c.custom_questions, custom_stop_words: c.custom_stop_words })) || [],
        roster: rosterRes.data?.map((r: any) => ({ ...r, cellId: r.cellid })) || [],
        meetings: meetingsRes.data?.map((m: any) => ({ ...m, cellId: m.cellid })) || [],
        weeklyReports: reportsRes.data?.map((r: any) => ({ ...r, cellId: r.cellid, custom_responses: r.custom_responses })) || [],
        adminPassword: settingsRes.data?.find((s: any) => s.id === 'admin')?.adminpassword || '123'
      });
      setLoading(false);
    };

    fetchData();

    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload: any) => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // When logging in as leader, default their active cell
  useEffect(() => {
    if (currentUser?.role === 'leader') {
      setActiveCellId(currentUser.cellId ?? null);
    }
  }, [currentUser]);

  const login = (role: 'admin' | 'leader', password: string, cellId: string | null = null) => {
    if (role === 'admin' && password === data.adminPassword) {
      setCurrentUser({ role: 'admin' });
      return true;
    }
    if (role === 'leader') {
      const cell = data.cells.find(c => c.id === cellId);
      if (cell && cell.password === password) {
        setCurrentUser({ role: 'leader', cellId: cellId || null });
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveCellId(null);
  };

  // Roster Management
  const updateMemberStatus = async (memberId: string, newType: 'M' | 'V') => {
    try {
      await supabase.from('roster').update({ type: newType }).eq('id', memberId);
    } catch (error: any) {
      alert("Error updating member: " + error.message);
    }
  };

  const addVisitor = async (cellId: string, name: string, phone: string) => {
    try {
      const id = Date.now().toString();
      const newVisitor: Member = { id, cellId, name, phone, type: 'V' };
      await supabase.from('roster').insert({ id, cellid: cellId, name, phone, type: 'V' });
      return newVisitor;
    } catch (error: any) {
      alert("Error adding visitor: " + error.message);
      throw error;
    }
  };

  const addMember = async (cellId: string, name: string, phone: string) => {
    try {
      const id = Date.now().toString();
      const newMember: Member = { id, cellId, name, phone, type: 'M' };
      await supabase.from('roster').insert({ id, cellid: cellId, name, phone, type: 'M' });
      return newMember;
    } catch (error: any) {
      alert("Error adding member: " + error.message);
      throw error;
    }
  };

  const saveMeeting = async (meeting: Meeting) => {
    try {
      const docId = `${meeting.cellId}_${meeting.date}`;
      const { cellId, ...rest } = meeting;
      await supabase.from('meetings').upsert({ ...rest, id: docId, cellid: cellId });
    } catch (error: any) {
      alert("Error saving meeting: " + error.message);
    }
  };

  const saveWeeklyReport = async (report: WeeklyReportData) => {
    try {
      const docId = `${report.cellId}_${report.date}`;
      const { cellId, ...rest } = report;
      await supabase.from('weeklyreports').upsert({ ...rest, id: docId, cellid: cellId });
    } catch (error: any) {
      alert("Error saving report: " + error.message);
    }
  };

  // Admin Features
  const createCell = async (name: string, leaderName: string, password?: string) => {
    try {
      const id = Date.now().toString();
      const newCell: Cell = { id, name, leaderName, password };
      await supabase.from('cells').insert({ id, name, leadername: leaderName, password });
    } catch (error: any) {
      alert("Error creating cell: " + error.message);
    }
  };

  const updateCellPassword = async (cellId: string, newPassword: string) => {
    try {
      await supabase.from('cells').update({ password: newPassword }).eq('id', cellId);
    } catch (error: any) {
      alert("Error updating password: " + error.message);
    }
  };

  const updateCellQuestions = async (cellId: string, questions: string[]) => {
    try {
      await supabase.from('cells').update({ custom_questions: questions }).eq('id', cellId);
    } catch (error: any) {
      alert("Error updating questions: " + error.message);
    }
  };

  const updateCellStopWords = async (cellId: string, words: string[]) => {
    try {
      await supabase.from('cells').update({ custom_stop_words: words }).eq('id', cellId);
    } catch (error: any) {
      alert("Error updating stop words: " + error.message);
    }
  };
  
  const updateAdminPassword = async (newPassword: string) => {
    try {
      await supabase.from('settings').update({ adminpassword: newPassword }).eq('id', 'admin');
    } catch (error: any) {
      alert("Error updating admin password: " + error.message);
    }
  };

  return (
    <DataContext.Provider value={{ 
      data, setData, 
      currentUser, login, logout,
      activeCellId, setActiveCellId, 
      updateMemberStatus, addVisitor, addMember, saveMeeting, saveWeeklyReport,
      createCell, updateCellPassword, updateAdminPassword, updateCellQuestions, updateCellStopWords,
      loading
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
