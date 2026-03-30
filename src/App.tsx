/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useState, useEffect, FormEvent } from "react";
import { Github, Linkedin, Mail, Menu, Phone, MapPin } from "lucide-react";
import ProjectCard from "./components/ProjectCard";
import { Project } from "./types";
import { db, auth, collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, setDoc, serverTimestamp, addDoc, login, logout } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Plus, LogIn, LogOut, X as CloseX, Sparkles, Loader2 } from "lucide-react";
import { GoogleGenAI, Type } from "@google/genai";

const PROJECTS: Project[] = [
  {
    id: "1",
    title: "Isometric Spatial Logic",
    category: "Architecture",
    year: "2024",
    image: "https://images.unsplash.com/photo-1503387762-592dec58ef4e?auto=format&fit=crop&q=80&w=2000",
    description: "A 3D isometric study of interior spatial flow and structural hierarchy, utilizing red accents to highlight core circulation paths.",
    section: 'work'
  },
  {
    id: "2",
    title: "Urban Monolith",
    category: "Mixed-Use",
    year: "2023",
    image: "https://picsum.photos/seed/arch2/1200/1500",
    description: "A vertical intervention in the dense urban fabric of Shanghai, focusing on public voids and social connectivity.",
    section: 'work'
  },
  {
    id: "3",
    title: "Desert Sanctuary",
    category: "Hospitality",
    year: "2023",
    image: "https://picsum.photos/seed/arch3/1200/1500",
    description: "Thermal mass experimentation using local materials to create a self-cooling retreat in extreme climates.",
    section: 'work'
  }
];


export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    category: "",
    year: new Date().getFullYear().toString(),
    image: "",
    description: "",
    section: 'work' as 'work' | 'drawing' | 'vision'
  });

  const ADMIN_EMAIL = "thaihung8599231@gmail.com";

  const generateMetadata = async (imageUrl: string, currentYear: string) => {
    if (!imageUrl) return null;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Try to fetch the image and convert to base64 for better analysis
      let imagePart: any = null;
      try {
        const imgRes = await fetch(imageUrl);
        const blob = await imgRes.blob();
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
        const base64Data = await base64Promise;
        imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: blob.type || "image/jpeg"
          }
        };
      } catch (e) {
        console.warn("Could not fetch image for direct analysis, falling back to URL description", e);
      }

      const prompt = `Generate a professional architectural project metadata in JSON format.
            The project is for the year ${currentYear}.
            ${!imagePart ? `Analyze this image URL: ${imageUrl}` : "Analyze the provided image."}
            Return:
            - title: A creative and professional title (e.g., "Spatial Latency", "Urban Monolith").
            - category: A short category (e.g., "Architecture", "Mixed-Use", "Installation").
            - description: A single, punchy sentence that captures the spatial atmosphere and generation logic. Use the voice of a cross-disciplinary designer—concise, modern, and avoiding academic jargon.
            Keep it consistent with a minimalist, high-end architectural portfolio style.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: imagePart ? { parts: [imagePart, { text: prompt }] } : prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "category", "description"]
          }
        }
      });

      const data = JSON.parse(response.text);
      return data;
    } catch (error) {
      console.error("Error generating metadata:", error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoFill = async () => {
    const metadata = await generateMetadata(newProject.image, newProject.year);
    if (metadata) {
      setNewProject(prev => ({
        ...prev,
        ...metadata
      }));
    }
  };

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  useEffect(() => {
    // 1. Listen for Auth changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsAdmin(user?.email === ADMIN_EMAIL);
    });

    // 2. Listen for Firestore changes
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const fetchedProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      
      // If no projects in Firestore, use the static ones as fallback
      if (fetchedProjects.length === 0) {
        setProjects(PROJECTS);
      } else {
        setProjects(fetchedProjects);
      }
    }, (error) => {
      console.error("Firestore error:", error);
      setProjects(PROJECTS); // Fallback on error
    });

    return () => {
      unsubscribeAuth();
      unsubscribeFirestore();
    };
  }, []);

  const handleAddProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    let finalProject = { ...newProject };

    // If any field is missing, auto-generate
    if (!finalProject.title || !finalProject.category || !finalProject.description) {
      const metadata = await generateMetadata(finalProject.image, finalProject.year);
      if (metadata) {
        finalProject = {
          ...finalProject,
          title: finalProject.title || metadata.title,
          category: finalProject.category || metadata.category,
          description: finalProject.description || metadata.description,
        };
      }
    }
    
    try {
      await addDoc(collection(db, 'projects'), {
        ...finalProject,
        createdAt: serverTimestamp()
      });
      setShowAddForm(false);
      setNewProject({
        title: "",
        category: "",
        year: new Date().getFullYear().toString(),
        image: "",
        description: "",
        section: 'work'
      });
    } catch (error) {
      console.error("Error adding project:", error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const handleUpdateProject = async (id: string, updates: Partial<Project>) => {
    if (!isAdmin) return;
    const projectToUpdate = projects.find(p => p.id === id);
    if (!projectToUpdate) return;
    
    try {
      await setDoc(doc(db, 'projects', id), {
        ...projectToUpdate,
        ...updates,
        createdAt: projectToUpdate.createdAt || serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  const handleUpdateImage = async (id: string, newUrl: string) => {
    // This is kept for backward compatibility if needed, but we'll use handleUpdateProject
    await handleUpdateProject(id, { image: newUrl });
  };

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.1]);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-bg text-ink selection:bg-accent selection:text-white">
      {/* Background Grid */}
      <div className="fixed inset-0 grid-lines pointer-events-none z-0 opacity-40" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-8 md:px-12 flex justify-between items-start">
        <div className="font-display text-2xl uppercase leading-none tracking-tighter">
          JTLI
        </div>
        <div className="flex flex-col items-end gap-1 font-mono text-[10px] uppercase tracking-widest">
          <a href="#architect" className="hover:text-accent transition-colors">01 / Architect</a>
          <a href="#diagram" className="hover:text-accent transition-colors">02 / Diagram</a>
          <a href="#vision" className="hover:text-accent transition-colors">03 / Vision</a>
          <a href="#about" className="hover:text-accent transition-colors">04 / About</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col justify-end px-6 md:px-12 pb-24 z-10 overflow-hidden">
        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="max-w-full">
          <h1 className="font-display text-[clamp(4rem,15vw,12rem)] md:text-[clamp(6rem,18vw,16rem)] leading-[0.8] uppercase tracking-tighter mb-[15px] pointer-events-none relative z-0">
            Latent <br />
            <span className="text-stroke">Spaces.</span>
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] leading-relaxed opacity-60">
                Architect & AI Product Manager <br />
                Exploring the intersection of <br />
                physical rigor and digital fluidity.
              </p>
            </div>
            <div className="md:col-span-8 flex justify-end gap-12">
              <div className="vertical-rl font-mono text-[10px] uppercase tracking-widest opacity-30">
                Scroll to explore — 2026
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Architect Section */}
      <section id="architect" className="relative z-10 px-6 md:px-12 py-32 border-t border-ink">
        <div className="max-w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-3">
              <div className="sticky top-32 space-y-4">
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-40">[01]</span>
                <h2 className="font-display text-6xl uppercase leading-none">
                  Architect <br />
                  <span className="text-[10px] font-mono tracking-[0.3em] text-stone-400 block mt-2">Selected</span>
                </h2>
              </div>
            </div>
            <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-32">
              {projects.filter(p => p.section === 'work').map((project, i) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  index={i} 
                  onDelete={isAdmin ? handleDeleteProject : undefined}
                  onUpdate={isAdmin ? handleUpdateProject : undefined}
                  onGenerateMetadata={isAdmin ? generateMetadata : undefined}
                />
              ))}
              
              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setNewProject(prev => ({ ...prev, section: 'work' }));
                    setShowAddForm(true);
                  }}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-ink/20 rounded-xl aspect-[16/9] hover:border-accent hover:text-accent transition-all group"
                >
                  <Plus size={48} className="mb-4 opacity-20 group-hover:opacity-100 transition-opacity" />
                  <span className="font-mono text-[10px] uppercase tracking-widest font-bold">Add New Architect</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Diagram Section */}
      <section id="diagram" className="relative z-10 px-6 md:px-12 py-32 border-t border-ink">
        <div className="max-w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-3">
              <div className="sticky top-32 space-y-4">
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-40">[02]</span>
                <h2 className="font-display text-6xl uppercase leading-none">
                  Diagram <br />
                  <span className="text-[10px] font-mono tracking-[0.3em] text-stone-400 block mt-2">Exploration</span>
                </h2>
              </div>
            </div>
            <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-32">
              {projects.filter(p => p.section === 'drawing').map((project, i) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  index={i} 
                  onDelete={isAdmin ? handleDeleteProject : undefined}
                  onUpdate={isAdmin ? handleUpdateProject : undefined}
                  onGenerateMetadata={isAdmin ? generateMetadata : undefined}
                />
              ))}
              
              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setNewProject(prev => ({ ...prev, section: 'drawing' }));
                    setShowAddForm(true);
                  }}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-ink/20 rounded-xl aspect-[16/9] hover:border-accent hover:text-accent transition-all group"
                >
                  <Plus size={48} className="mb-4 opacity-20 group-hover:opacity-100 transition-opacity" />
                  <span className="font-mono text-[10px] uppercase tracking-widest font-bold">Add New Diagram</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="relative z-10 px-6 md:px-12 py-32 border-t border-ink">
        <div className="max-w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-3">
              <div className="sticky top-32 space-y-4">
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-40">[03]</span>
                <h2 className="font-display text-6xl uppercase leading-none">
                  Vision <br />
                  <span className="text-[10px] font-mono tracking-[0.3em] text-stone-400 block mt-2">Speculative</span>
                </h2>
              </div>
            </div>
            <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-32">
              {projects.filter(p => p.section === 'vision').map((project, i) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  index={i} 
                  onDelete={isAdmin ? handleDeleteProject : undefined}
                  onUpdate={isAdmin ? handleUpdateProject : undefined}
                  onGenerateMetadata={isAdmin ? generateMetadata : undefined}
                />
              ))}
              
              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setNewProject(prev => ({ ...prev, section: 'vision' }));
                    setShowAddForm(true);
                  }}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-ink/20 rounded-xl aspect-[16/9] hover:border-accent hover:text-accent transition-all group"
                >
                  <Plus size={48} className="mb-4 opacity-20 group-hover:opacity-100 transition-opacity" />
                  <span className="font-mono text-[10px] uppercase tracking-widest font-bold">Add New Vision</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Add Project Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-ink/90 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bg w-full max-w-2xl p-12 rounded-2xl relative"
          >
            <button 
              onClick={() => setShowAddForm(false)}
              className="absolute top-8 right-8 hover:text-accent transition-colors"
            >
              <CloseX size={24} />
            </button>
            
            <h3 className="font-display text-4xl uppercase mb-12">New Project</h3>
            
            <form onSubmit={handleAddProject} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase tracking-widest opacity-40">Title (Optional)</label>
                  <input 
                    type="text" 
                    value={newProject.title}
                    onChange={e => setNewProject({...newProject, title: e.target.value})}
                    className="w-full bg-transparent border-b border-ink/20 py-2 outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase tracking-widest opacity-40">Category (Optional)</label>
                  <input 
                    type="text" 
                    value={newProject.category}
                    onChange={e => setNewProject({...newProject, category: e.target.value})}
                    className="w-full bg-transparent border-b border-ink/20 py-2 outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase tracking-widest opacity-40">Year</label>
                  <input 
                    required
                    type="text" 
                    value={newProject.year}
                    onChange={e => setNewProject({...newProject, year: e.target.value})}
                    className="w-full bg-transparent border-b border-ink/20 py-2 outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="space-y-2 relative">
                  <label className="font-mono text-[10px] uppercase tracking-widest opacity-40">Image URL</label>
                  <div className="flex gap-2">
                    <input 
                      required
                      type="url" 
                      value={newProject.image}
                      onChange={e => setNewProject({...newProject, image: e.target.value})}
                      className="flex-1 bg-transparent border-b border-ink/20 py-2 outline-none focus:border-accent transition-colors"
                    />
                    <button
                      type="button"
                      disabled={isGenerating || !newProject.image}
                      onClick={handleAutoFill}
                      className="p-2 hover:text-accent transition-colors disabled:opacity-20"
                      title="Auto-generate metadata from image"
                    >
                      {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-widest opacity-40">Description (Optional)</label>
                <textarea 
                  value={newProject.description}
                  onChange={e => setNewProject({...newProject, description: e.target.value})}
                  className="w-full bg-transparent border-b border-ink/20 py-2 outline-none focus:border-accent transition-colors resize-none h-24"
                />
              </div>
              
              <button 
                type="submit"
                disabled={isGenerating}
                className="w-full bg-ink text-bg py-4 font-mono text-xs uppercase tracking-widest hover:bg-accent transition-colors rounded-lg mt-8 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating & Publishing...
                  </>
                ) : (
                  "Publish Project"
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
      {/* About Section */}
      <section id="about" className="relative z-10 px-6 md:px-12 py-48 border-t border-ink">
        <div className="max-w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-24">
            <div className="md:col-span-6">
              <h2 className="font-display text-7xl md:text-9xl uppercase leading-[0.85] tracking-tighter mb-12">
                structure <br /> & <br /> <span className="text-accent">probabilistic</span>
              </h2>
              
              <div className="pt-12 border-t border-ink/20 max-w-xs">
                <div className="space-y-4">
                  <h4 className="font-mono text-[10px] uppercase tracking-widest opacity-40">Contact</h4>
                  <ul className="space-y-2 text-[10px] uppercase tracking-widest font-medium">
                    <li className="flex items-center gap-2">
                      <Mail size={10} className="opacity-40" />
                      <span>li741336886@126.com</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Phone size={10} className="opacity-40" />
                      <span>13989857701</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <MapPin size={10} className="opacity-40" />
                      <span>SHANGHAI</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="md:col-span-6 flex flex-col justify-end">
              {/* Right column empty or for future use */}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 md:px-12 py-12 border-t border-ink bg-bg">
        <div className="flex flex-col gap-12">
          <div className="flex justify-center items-center">
            <div className="font-display text-2xl uppercase tracking-tighter">
              JTLI
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-ink/10 pt-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] opacity-40">
              © 2026 JTLI / All rights reserved.
            </div>
            
            <div>
              {isAdmin ? (
                <button 
                  onClick={() => logout()}
                  className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest hover:text-accent transition-colors"
                >
                  <LogOut size={12} /> Logout
                </button>
              ) : (
                <button 
                  onClick={() => login()}
                  className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest opacity-20 hover:opacity-100 hover:text-accent transition-all"
                >
                  <LogIn size={12} /> Admin Login
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
