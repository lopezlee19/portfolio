import { motion, AnimatePresence } from "motion/react";
import { Project } from "../types";
import { Trash2, Edit2, Check, X, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";

interface ProjectCardProps {
  key?: string | number;
  project: Project;
  index: number;
  onDelete?: (id: string) => Promise<void> | void;
  onUpdate?: (id: string, updates: Partial<Project>) => Promise<void> | void;
  onGenerateMetadata?: (imageUrl: string, currentYear: string) => Promise<{title: string, category: string, description: string} | null>;
}

export default function ProjectCard({ project, index, onDelete, onUpdate, onGenerateMetadata }: ProjectCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState({
    title: project.title,
    category: project.category,
    image: project.image,
    description: project.description
  });

  const handleUpdate = async () => {
    if (onUpdate) {
      await onUpdate(project.id, editData);
    }
    setIsEditing(false);
  };

  const handleAutoGenerate = async () => {
    if (!onGenerateMetadata) return;
    setIsGenerating(true);
    try {
      const metadata = await onGenerateMetadata(editData.image, project.year);
      if (metadata) {
        setEditData(prev => ({
          ...prev,
          ...metadata
        }));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
      className="group relative flex flex-col border-t border-ink pt-4 project-card-container"
    >
      <div className="flex justify-between items-start mb-8">
        <span className="font-mono text-[10px] uppercase tracking-widest">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="text-right">
          <h3 className="font-display text-4xl uppercase leading-none mb-1 group-hover:text-accent transition-colors">
            {project.title}
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-40">
            {project.category} / {project.year}
          </span>
        </div>
      </div>
      
      <div className="relative aspect-[16/9] overflow-hidden bg-stone-100 mb-6 group/img">
        {onDelete && !isEditing && (
          <div className="flex gap-2 absolute top-4 right-4 z-40 opacity-100 transition-opacity">
            {showDeleteConfirm ? (
              <div className="flex gap-2 bg-ink/90 backdrop-blur-sm p-1 rounded-full border border-white/10">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id);
                    setShowDeleteConfirm(false);
                  }}
                  className="p-2 bg-accent text-white rounded-full hover:bg-accent/80 transition-colors"
                  title="Confirm Delete"
                >
                  <Check size={14} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                  className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                  title="Cancel Delete"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="p-2 bg-ink/80 text-bg rounded-full hover:bg-accent transition-colors"
                  title="Delete Project"
                >
                  <Trash2 size={14} />
                </button>
                {onUpdate && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditData({
                        title: project.title,
                        category: project.category,
                        image: project.image,
                        description: project.description
                      });
                      setIsEditing(true);
                    }}
                    className="p-2 bg-ink/80 text-bg rounded-full hover:bg-accent transition-colors"
                    title="Edit Project"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <AnimatePresence>
          {isEditing && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-0 z-50 bg-ink/95 backdrop-blur-md flex flex-col p-8 text-left overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <p className="text-bg font-mono text-[10px] uppercase tracking-widest">Edit Project</p>
                <div className="flex gap-4">
                  <button 
                    onClick={handleUpdate}
                    disabled={isGenerating}
                    className="flex items-center gap-2 text-bg font-mono text-[10px] uppercase tracking-widest hover:text-accent transition-colors disabled:opacity-20"
                  >
                    <Check size={14} /> Save
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 text-bg font-mono text-[10px] uppercase tracking-widest hover:text-red-400 transition-colors"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-bg/40 font-mono text-[8px] uppercase tracking-widest">Image URL</label>
                  <div className="flex gap-2">
                    <input 
                      type="url"
                      value={editData.image}
                      onChange={(e) => setEditData({...editData, image: e.target.value})}
                      className="flex-1 bg-transparent border-b border-bg/20 text-bg py-1 outline-none focus:border-accent transition-colors text-[10px] font-mono"
                    />
                    <button
                      onClick={handleAutoGenerate}
                      disabled={isGenerating || !editData.image}
                      className="text-bg/60 hover:text-accent transition-colors disabled:opacity-20"
                      title="Auto-generate metadata"
                    >
                      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-bg/40 font-mono text-[8px] uppercase tracking-widest">Title</label>
                    <input 
                      type="text"
                      value={editData.title}
                      onChange={(e) => setEditData({...editData, title: e.target.value})}
                      className="w-full bg-transparent border-b border-bg/20 text-bg py-1 outline-none focus:border-accent transition-colors text-[10px] font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-bg/40 font-mono text-[8px] uppercase tracking-widest">Category</label>
                    <input 
                      type="text"
                      value={editData.category}
                      onChange={(e) => setEditData({...editData, category: e.target.value})}
                      className="w-full bg-transparent border-b border-bg/20 text-bg py-1 outline-none focus:border-accent transition-colors text-[10px] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-bg/40 font-mono text-[8px] uppercase tracking-widest">Description</label>
                  <textarea 
                    value={editData.description}
                    onChange={(e) => setEditData({...editData, description: e.target.value})}
                    className="w-full bg-transparent border-b border-bg/20 text-bg py-1 outline-none focus:border-accent transition-colors text-[10px] font-mono h-16 resize-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.img
          src={project.image}
          alt={project.title}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
          whileHover={{ scale: 1.05 }}
        />
      </div>

      <p className="text-xs leading-relaxed opacity-60 font-light max-w-xs self-end text-right">
        {project.description}
      </p>
    </motion.div>
  );
}
