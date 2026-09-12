import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../config/supabase';

export interface Cell {
  id: string;
  name: string;
  leaderName: string;
  password?: string;
  email?: string;
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

export interface PillarQuestion {
  pillar: string;
  questions: string[];
}

export const DEFAULT_PILLAR_QUESTIONS: PillarQuestion[] = [
  {
    pillar: "PRAYER",
    questions: [
      "I understand the importance of prayer as an essential part of my relationship and dependence on God.",
      "I have a practical and consistent daily prayer routine.",
      "I am growing in the depth, variety and effectiveness of my prayers, using biblical patterns of prayer.",
      "I pray with increasing confidence, faith and persistence, including when I do not immediately see answers.",
      "My prayer life is producing visible growth in my relationship with God and equipping me to pray with and encourage others."
    ]
  },
  {
    pillar: "THE WORD",
    questions: [
      "I read or study the Bible regularly.",
      "I meditate on God's Word and think about how it applies to my life.",
      "I apply the Word of God to my decisions, attitudes, relationships and daily life.",
      "I am growing in my knowledge and understanding of Scripture."
    ]
  },
  {
    pillar: "EVANGELISM",
    questions: [
      "I feel responsible to share my faith with people who do not know Jesus.",
      "I look for opportunities to build relationships with people who do not know Jesus.",
      "I am becoming more confident in sharing my testimony and the Gospel.",
      "I regularly pray for people who do not know Christ."
    ]
  },
  {
    pillar: "SERVICE",
    questions: [
      "I use my time and resources to care for the needs of others in my church and my local community.",
      "I regularly use my time, gifts and passion to serve God in my local Assembly",
      "I am actively involved in a service unit or department",
      "I look for ways my life can have an impact for God's Kingdom in my community/market place"
    ]
  }
];

export interface Assessment {
  id: string;
  cellId: string;
  memberId: string;
  date: string;
  scores: Record<string, Record<string, number>>; // { [pillarIndex]: { [questionIndex]: score } }
  timestamp: string;
}

export interface AppData {
  cells: Cell[];
  adminPassword?: string;
  pillarQuestions: PillarQuestion[];
  roster: Member[];
  meetings: Meeting[];
  assessments: Assessment[];
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
  updateMember: (memberId: string, phone: string, type: 'M' | 'V') => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  addVisitor: (cellId: string, name: string, phone: string) => Promise<Member>;
  addMember: (cellId: string, name: string, phone: string) => Promise<Member>;
  saveMeeting: (meeting: Meeting) => Promise<void>;
  saveAssessment: (assessment: Assessment) => Promise<void>;
  createCell: (name: string, leaderName: string, password?: string, email?: string) => Promise<void>;
  deleteCell: (cellId: string) => Promise<void>;
  updateCellPassword: (cellId: string, newPassword: string) => Promise<void>;
  updateCellEmail: (cellId: string, newEmail: string) => Promise<void>;
  updateCellQuestions: (cellId: string, questions: string[]) => Promise<void>;
  updateCellStopWords: (cellId: string, words: string[]) => Promise<void>;
  updateAdminPassword: (newPassword: string) => Promise<void>;
  updatePillarQuestions: (questions: PillarQuestion[]) => Promise<void>;
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const defaultData: AppData = {
  cells: [],
  adminPassword: '123',
  pillarQuestions: DEFAULT_PILLAR_QUESTIONS,
  roster: [],
  meetings: [],
  assessments: []
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
      const [cellsRes, rosterRes, meetingsRes, assessmentsRes, settingsRes] = await Promise.all([
        supabase.from('cells').select('*'),
        supabase.from('roster').select('*'),
        supabase.from('meetings').select('*'),
        supabase.from('assessments').select('*'),
        supabase.from('settings').select('*')
      ]);

      const adminSettings = settingsRes.data?.find((s: any) => s.id === 'admin');

      setData({
        cells: (cellsRes.data?.map((c: any) => ({ ...c, leaderName: c.leadername, email: c.email, custom_questions: c.custom_questions, custom_stop_words: c.custom_stop_words })) || []).sort((a: any, b: any) => a.name.localeCompare(b.name)),
        roster: rosterRes.data?.map((r: any) => ({ ...r, cellId: r.cellid })) || [],
        meetings: meetingsRes.data?.map((m: any) => ({ ...m, cellId: m.cellid })) || [],
        assessments: assessmentsRes.data?.map((r: any) => ({ ...r, cellId: r.cellid, memberId: r.memberid })) || [],
        pillarQuestions: adminSettings?.pillar_questions || DEFAULT_PILLAR_QUESTIONS,
        adminPassword: adminSettings?.adminpassword || '123'
      });
      setLoading(false);
    };

    fetchData();

    // 60-second polling fallback
    const intervalId = setInterval(() => {
      fetchData();
    }, 60000);

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
      clearInterval(intervalId);
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
      const { error } = await supabase.from('roster').update({ type: newType }).eq('id', memberId);
      if (error) throw error;
    } catch (error: any) {
      alert("Error updating member status: " + error.message);
      throw error;
    }
  };

  const updateMember = async (memberId: string, phone: string, type: 'M' | 'V') => {
    try {
      const { error } = await supabase.from('roster').update({ phone, type }).eq('id', memberId);
      if (error) throw error;
    } catch (error: any) {
      alert("Error updating member: " + error.message);
      throw error;
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase.from('roster').delete().eq('id', memberId);
      if (error) throw error;
    } catch (error: any) {
      alert("Error removing member: " + error.message);
      throw error;
    }
  };

  const addVisitor = async (cellId: string, name: string, phone: string) => {
    try {
      const id = Date.now().toString();
      const newVisitor: Member = { id, cellId, name, phone, type: 'V' };
      const { error } = await supabase.from('roster').insert({ id, cellid: cellId, name, phone, type: 'V' });
      if (error) throw error;
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
      const { error } = await supabase.from('roster').insert({ id, cellid: cellId, name, phone, type: 'M' });
      if (error) throw error;
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
      const { error } = await supabase.from('meetings').upsert({ ...rest, id: docId, cellid: cellId });
      if (error) throw error;
    } catch (error: any) {
      alert("Error saving meeting: " + error.message);
      throw error;
    }
  };

  const saveAssessment = async (assessment: Assessment) => {
    try {
      // id is already memberId_date
      const { cellId, memberId, ...rest } = assessment;
      const { error } = await supabase.from('assessments').upsert({ ...rest, cellid: cellId, memberid: memberId, id: assessment.id });
      if (error) throw error;
    } catch (error: any) {
      alert("Error saving assessment: " + error.message);
      throw error;
    }
  };

  // Admin Features
  const createCell = async (name: string, leaderName: string, password?: string, email?: string) => {
    try {
      const id = Date.now().toString();
      const newCell: Cell = { id, name, leaderName, password, email };
      const { error } = await supabase.from('cells').insert({ id, name, leadername: leaderName, password, email });
      if (error) throw error;
    } catch (error: any) {
      alert("Error creating cell: " + error.message);
      throw error;
    }
  };

  const deleteCell = async (cellId: string) => {
    try {
      const { error } = await supabase.from('cells').delete().eq('id', cellId);
      if (error) throw error;
    } catch (error: any) {
      alert("Error deleting cell: " + error.message);
      throw error;
    }
  };

  const updateCellPassword = async (cellId: string, newPassword: string) => {
    try {
      const { error } = await supabase.from('cells').update({ password: newPassword }).eq('id', cellId);
      if (error) throw error;
    } catch (error: any) {
      alert("Error updating password: " + error.message);
      throw error;
    }
  };

  const updateCellEmail = async (cellId: string, newEmail: string) => {
    try {
      const { error } = await supabase.from('cells').update({ email: newEmail }).eq('id', cellId);
      if (error) throw error;
    } catch (error: any) {
      alert("Error updating email: " + error.message);
      throw error;
    }
  };

  const updateCellQuestions = async (cellId: string, questions: string[]) => {
    try {
      const { error } = await supabase.from('cells').update({ custom_questions: questions }).eq('id', cellId);
      if (error) throw error;
    } catch (error: any) {
      alert("Error updating questions: " + error.message);
      throw error;
    }
  };

  const updateCellStopWords = async (cellId: string, words: string[]) => {
    try {
      const { error } = await supabase.from('cells').update({ custom_stop_words: words }).eq('id', cellId);
      if (error) throw error;
    } catch (error: any) {
      alert("Error updating stop words: " + error.message);
      throw error;
    }
  };
  
  const updateAdminPassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.from('settings').update({ adminpassword: newPassword }).eq('id', 'admin');
      if (error) throw error;
    } catch (error: any) {
      alert("Error updating admin password: " + error.message);
      throw error;
    }
  };

  const updatePillarQuestions = async (questions: PillarQuestion[]) => {
    try {
      const { error } = await supabase.from('settings').update({ pillar_questions: questions }).eq('id', 'admin');
      if (error) throw error;
    } catch (error: any) {
      alert("Error updating pillar questions: " + error.message);
      throw error;
    }
  };

  return (
    <DataContext.Provider value={{ 
      data, setData, 
      currentUser, login, logout,
      activeCellId, setActiveCellId, 
      updateMemberStatus, updateMember, removeMember, addVisitor, addMember, saveMeeting, saveAssessment,
      createCell, deleteCell, updateCellPassword, updateCellEmail, updateAdminPassword, updateCellQuestions, updateCellStopWords, updatePillarQuestions,
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
