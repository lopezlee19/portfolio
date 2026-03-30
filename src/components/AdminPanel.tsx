import React, { useState, useEffect } from 'react';
import { auth, db, login, logout, collection, addDoc, serverTimestamp, deleteDoc, doc } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Project } from '../types';
import { Plus, Trash2, X, Upload, LogIn, LogOut, Loader2 } from 'lucide-react';

interface AdminPanelProps {
  projects: Project[];
}

export default function AdminPanel({ projects }: AdminPanelProps) {
  const [user, setUser] = useState<User | null>(null);

  const ADMIN_EMAIL = "li741336886@126.com";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL;

  if (!user) {
    return (
      <button 
        onClick={login}
        className="fixed bottom-8 right-8 z-50 p-3 bg-ink text-bg rounded-full shadow-xl hover:scale-110 transition-transform flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono"
      >
        <LogIn size={16} />
        Admin
      </button>
    );
  }

  if (!isAdmin) {
    return (
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2">
        <p className="bg-red-500 text-white text-[8px] px-2 py-1 rounded uppercase font-mono">Not Authorized</p>
        <button 
          onClick={logout}
          className="p-3 bg-ink text-bg rounded-full shadow-xl hover:scale-110 transition-transform flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    );
  }

  return (
    <>
      <button 
        onClick={logout}
        className="fixed bottom-8 right-8 z-50 p-3 bg-ink text-bg rounded-full shadow-xl hover:scale-110 transition-transform flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono"
      >
        <LogOut size={16} />
        Logout
      </button>

      <style>{`
        .admin-btn {
          padding: 0.6rem;
          border-radius: 50%;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, background-color 0.2s;
          backdrop-filter: blur(4px);
        }
        .admin-btn:hover {
          transform: scale(1.1);
        }
        .admin-btn.delete {
          background: rgba(255, 0, 0, 0.6);
        }
        .admin-btn.delete:hover {
          background: rgba(255, 0, 0, 0.9);
        }
        .admin-btn.edit {
          background: rgba(0, 0, 0, 0.6);
        }
        .admin-btn.edit:hover {
          background: rgba(0, 0, 0, 0.9);
        }
      `}</style>
    </>
  );
}
