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
      "I pray with increasing confidence, faith and persistence, including when I do not immediately see answers."
    ]
  },
  {
    pillar: "THE WORD",
    questions: [
      "I read or study the Bible regularly.",
      "I meditate on God's Word and think about how it applies to my life.",
      "I am growing in my knowledge and understanding of Scripture.",
      "I apply the Word of God to my decisions, attitudes, relationships and daily life."
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
      "I build a regular rhythm of serving God and others.",
      "I actively look for ways to help out in my community or cell.",
      "I serve with a joyful and willing heart.",
      "I encourage others to join in serving."
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
  addVisitor: (cellId: string, name: string, phone: string) => Promise<Member>;
  addMember: (cellId: string, name: string, phone: string) => Promise<Member>;
  saveMeeting: (meeting: Meeting) => Promise<void>;
  saveAssessment: (assessment: Assessment) => Promise<void>;
  createCell: (name: string, leaderName: string, password?: string) => Promise<void>;
  deleteCell: (cellId: string) => Promise<void>;
  updateCellPassword: (cellId: string, newPassword: string) => Promise<void>;
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
        cells: cellsRes.data?.map((c: any) => ({ ...c, leaderName: c.leadername, custom_questions: c.custom_questions, custom_stop_words: c.custom_stop_words })) || [],
        roster: rosterRes.data?.map((r: any) => ({ ...r, cellId: r.cellid })) || [],
        meetings: meetingsRes.data?.map((m: any) => ({ ...m, cellId: m.cellid })) || [],
        assessments: assessmentsRes.data?.map((r: any) => ({ ...r, cellId: r.cellid, memberId: r.memberid })) || [],
        pillarQuestions: adminSettings?.pillar_questions || DEFAULT_PILLAR_QUESTIONS,
        adminPassword: adminSettings?.adminpassword || '123'
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

  const saveAssessment = async (assessment: Assessment) => {
    try {
      // id is already memberId_date
      const { cellId, memberId, ...rest } = assessment;
      await supabase.from('assessments').upsert({ ...rest, cellid: cellId, memberid: memberId, id: assessment.id });
    } catch (error: any) {
      alert("Error saving assessment: " + error.message);
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

  const deleteCell = async (cellId: string) => {
    try {
      await supabase.from('cells').delete().eq('id', cellId);
    } catch (error: any) {
      alert("Error deleting cell: " + error.message);
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

  const updatePillarQuestions = async (questions: PillarQuestion[]) => {
    try {
      await supabase.from('settings').update({ pillar_questions: questions }).eq('id', 'admin');
    } catch (error: any) {
      alert("Error updating pillar questions: " + error.message);
    }
  };

  return (
    <DataContext.Provider value={{ 
      data, setData, 
      currentUser, login, logout,
      activeCellId, setActiveCellId, 
      updateMemberStatus, addVisitor, addMember, saveMeeting, saveAssessment,
      createCell, deleteCell, updateCellPassword, updateAdminPassword, updateCellQuestions, updateCellStopWords, updatePillarQuestions,
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
