import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { 
  Home, 
  TrendingUp, 
  Users, 
  Bookmark, 
  Settings, 
  LogIn, 
  PlusSquare, 
  AlertCircle, 
  MessageSquare, 
  Share2, 
  ArrowBigUp, 
  ArrowBigDown, 
  Search, 
  Bell, 
  Hash, 
  ShieldCheck, 
  MoreHorizontal,
  Flame,
  Clock,
  ChevronRight
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithGoogle, logout, createUserProfile, generatePseudonym, savePost, unsavePost } from './lib/firebase';
import { usePosts, createPost, Post } from './hooks/usePosts';
import { useComments, createComment } from './hooks/useComments';
import { useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Localization Helpers ---
const formatDate = (date: any) => {
  if (!date) return 'justo ahora';
  return formatDistanceToNow(date.toDate(), { addSuffix: true, locale: es });
};

// --- Components ---
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profile } = useAuth();
  const [showPseudonymModal, setShowPseudonymModal] = useState(false);

  useEffect(() => {
    if (user && !loading && !profile) {
      setShowPseudonymModal(true);
    }
  }, [user, loading, profile]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen gap-6 bg-dark-surface">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-primary rounded-full animate-pulse"></div>
        </div>
      </div>
      <p className="text-accent font-display font-bold tracking-widest uppercase text-xs">Iniciando LUMI</p>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  return (
    <>
      <AnimatePresence>
        {showPseudonymModal && (
          <PseudonymSetup onClose={() => setShowPseudonymModal(false)} />
        )}
      </AnimatePresence>
      {children}
    </>
  );
};

const PseudonymSetup = ({ onClose }: { onClose: () => void }) => {
  const { user, refreshProfile } = useAuth();
  const [pseudonym, setPseudonym] = useState(generatePseudonym());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || pseudonym.length < 3) return;
    
    setLoading(true);
    try {
      await createUserProfile(user.uid, {
        pseudonym,
        displayName: user.displayName || '',
        avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${pseudonym}`,
      });
      await refreshProfile();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-surface/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-gray-100"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 shadow-xl shadow-primary/20">
          <ShieldCheck className="text-white w-10 h-10" />
        </div>
        <h3 className="text-3xl font-display font-extrabold text-primary mb-3">Tu Identidad Segura</h3>
        <p className="text-gray-500 mb-8 leading-relaxed font-medium">
          Hemos generado un seudónimo aleatorio para proteger tu anonimato en las comunidades. Puedes cambiarlo ahora o mantenerlo.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Seudónimo de Enfermería</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Ej: HeroeDeGuardia"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white outline-none transition-all font-bold text-lg"
                value={pseudonym}
                onChange={(e) => setPseudonym(e.target.value)}
                minLength={3}
                required
              />
              <button 
                type="button"
                onClick={() => setPseudonym(generatePseudonym())}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-accent font-bold text-xs p-2 hover:bg-accent/10 rounded-lg transition-colors"
              >
                Aleatorio
              </button>
            </div>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-display font-bold py-4 rounded-2xl hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50 transition-all text-lg"
          >
            {loading ? 'Preparando todo...' : 'Entrar a LUMI'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const CreatePostModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    setLoading(true);
    setError(null);
    try {
      await createPost({
        authorId: user.uid,
        authorPseudonym: profile.pseudonym,
        authorAvatar: profile.avatarUrl,
        title,
        content,
        communityId: 'all',
        communityName: 'Enfermería Global',
        isAnonymous: false,
      });
      setTitle('');
      setContent('');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-dark-surface/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="bg-white rounded-[2rem] p-8 max-w-xl w-full shadow-2xl overflow-hidden relative border border-gray-100"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-display font-extrabold text-primary">Crear Publicación</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-sm font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          
          <input 
            type="text" 
            placeholder="Título de tu publicación"
            className="w-full px-0 py-3 text-2xl font-display font-bold border-b-2 border-gray-100 focus:border-accent outline-none placeholder:text-gray-300 transition-all"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
          
          <textarea 
            placeholder="Comparte tu experiencia, dudas clínicas o reflexiones..."
            rows={5}
            className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-accent focus:bg-white outline-none resize-none transition-all font-medium"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />

          <div className="flex items-center justify-between pt-4 gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium italic max-w-[240px]">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-secondary" />
              <span>Moderado por IA para detectar desinformación médica.</span>
            </div>
            <button 
              type="submit"
              disabled={loading || !title || !content}
              className="bg-primary text-white font-display font-bold px-8 py-3 rounded-2xl hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-30 transition-all"
            >
              {loading ? 'Analizando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const Sidebar = () => {
  const { user, profile } = useAuth();
  const navItems = [
    { name: 'Inicio', icon: Home, path: '/' },
    { name: 'Tendencias', icon: TrendingUp, path: '/popular' },
    { name: 'Comunidades', icon: Users, path: '/communities' },
    { name: 'Notificaciones', icon: Bell, path: '/notifications' },
    { name: 'Guardados', icon: Bookmark, path: '/saved' },
    { name: 'Perfil', icon: ShieldCheck, path: `/profile/${user?.uid}` },
    { name: 'Configuración', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 border-r border-gray-100 bg-white hidden xl:flex flex-col p-6 z-40">
      <Link to="/" className="flex items-center gap-3 mb-10 px-2 group">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
          <PlusSquare className="text-white w-6 h-6" />
        </div>
        <span className="text-3xl font-display font-black tracking-tighter text-primary">LUMI</span>
      </Link>

      <nav className="flex-1 space-y-2">
        <p className="px-3 pb-2 text-[10px] font-extrabold text-gray-300 uppercase tracking-widest">Navegación</p>
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className="flex items-center gap-4 px-4 py-3.5 text-gray-500 hover:bg-gray-50 rounded-2xl transition-all font-display font-bold hover:text-primary group"
          >
            <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform opacity-60 group-hover:opacity-100 group-hover:text-accent" />
            {item.name}
          </Link>
        ))}
      </nav>

      {user && (
        <div className="pt-6 mt-6 border-t border-gray-50">
          <div className="bg-gray-50 rounded-3xl p-4 flex items-center gap-3 mb-4 ring-1 ring-black/5">
            <img 
              src={profile?.avatarUrl} 
              className="w-12 h-12 rounded-2xl bg-white shadow-sm ring-2 ring-white" 
              alt="Avatar"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-display font-extrabold truncate text-primary">{profile?.pseudonym}</p>
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                <p className="text-[10px] font-bold text-gray-400 tabular-nums">{profile?.karma} Karma</p>
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"
          >
            Cerrar Sesión
          </button>
        </div>
      )}
    </aside>
  );
};

const RightPanel = () => {
  return (
    <aside className="fixed right-0 top-0 h-screen w-80 border-l border-gray-100 bg-white hidden 2xl:flex flex-col p-6 z-40">
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
        <input 
          type="text" 
          placeholder="Buscar en LUMI..."
          className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-accent outline-none text-sm font-medium transition-all"
        />
      </div>

      <div className="space-y-8">
        <div className="bg-gradient-to-br from-primary to-indigo-900 rounded-[2rem] p-6 text-white shadow-xl shadow-primary/20">
          <h4 className="text-lg font-display font-extrabold mb-2 uppercase tracking-tight">Comunidades Pro</h4>
          <p className="text-xs text-indigo-200 mb-4 font-medium">Únete a gremios certificados para contenido exclusivo.</p>
          <button className="w-full bg-accent text-white font-bold py-2.5 rounded-xl text-xs hover:bg-white hover:text-primary transition-all shadow-lg">Descubrir</button>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4 px-2">
            <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Tendencias</h4>
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <div className="space-y-4">
            {['#GuardiaNocturna', '#UCI_Tips', '#EnfermeroEnProceso', '#SaludMental'].map((tag) => (
              <a key={tag} href="#" className="flex items-center justify-between group px-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                    <Hash className="w-4 h-4 text-gray-300 group-hover:text-accent transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary group-hover:text-accent transition-colors">{tag}</p>
                    <p className="text-[10px] font-bold text-gray-440">1.2k publicaciones</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-200 group-hover:translate-x-1 transition-transform" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

const PostCard = ({ post }: { post: Post }) => {
  const { user, profile, refreshProfile } = useAuth();
  const isSaved = profile?.savedPosts?.includes(post.id);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) return;
    
    try {
      if (isSaved) {
        await unsavePost(user.uid, post.id);
      } else {
        await savePost(user.uid, post.id);
      }
      await refreshProfile();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div 
      layout
      className="bg-white rounded-[2rem] border border-gray-100 p-7 shadow-sm hover:premium-shadow transition-all group relative animate-in fade-in slide-in-from-bottom-5 duration-700"
    >
      <div className="flex items-start gap-4 mb-5">
        <img src={post.authorAvatar} alt="Alt" className="w-12 h-12 rounded-2xl bg-gray-50 ring-2 ring-gray-50" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-display font-extrabold text-primary">u/{post.authorPseudonym}</span>
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">{formatDate(post.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full",
              post.medicalFlag ? "bg-red-50 text-red-500 ring-1 ring-red-100" : "bg-secondary/10 text-secondary"
            )}>
              {post.medicalFlag ? 'Aviso Médico' : post.communityName}
            </span>
            {post.hashtags?.slice(0, 2).map(h => (
              <span key={h} className="text-[9px] font-bold text-accent uppercase">{h}</span>
            ))}
          </div>
        </div>
        <button className="p-2 hover:bg-gray-50 rounded-xl text-gray-300 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <Link to={`/post/${post.id}`}>
        <h3 className="text-2xl font-display font-extrabold text-primary mb-3 leading-tight group-hover:text-accent transition-colors">
          {post.title}
        </h3>
        <p className="text-gray-500 text-base leading-relaxed mb-6 line-clamp-3 font-medium">
          {post.content}
        </p>
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-2 py-1.5 p-1 group/votes shadow-inner">
          <button className="p-2 hover:text-accent hover:bg-white rounded-xl transition-all"><ArrowBigUp className="w-7 h-7" /></button>
          <span className="text-sm font-extrabold text-primary tabular-nums px-1">{post.score}</span>
          <button className="p-2 hover:text-red-400 hover:bg-white rounded-xl transition-all"><ArrowBigDown className="w-7 h-7" /></button>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/post/${post.id}`} className="flex items-center gap-2 hover:bg-gray-50 px-4 py-2.5 rounded-2xl transition-colors group/btn">
            <MessageSquare className="w-5 h-5 text-gray-300 group-hover/btn:text-primary transition-colors" />
            <span className="text-xs font-bold text-gray-400 group-hover/btn:text-primary">{post.commentCount} <span className="hidden sm:inline">comentarios</span></span>
          </Link>
          
          <button className="p-2.5 hover:bg-gray-50 rounded-2xl text-gray-300 hover:text-accent transition-all group/btn">
            <Share2 className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handleSave}
            className={cn(
              "p-2.5 rounded-2xl transition-all group/btn",
              isSaved ? "bg-accent/10 text-accent" : "text-gray-300 hover:bg-gray-50 hover:text-primary"
            )}
          >
            <Bookmark className={cn("w-5 h-5", isSaved && "fill-current")} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { posts } = usePosts(); 
  const post = posts.find(p => p.id === id);
  const { comments, loading: commentsLoading } = useComments(id || '');
  const { user, profile } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !id || !newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      await createComment(id, {
        authorId: user.uid,
        authorPseudonym: profile.pseudonym,
        authorAvatar: profile.avatarUrl,
        content: newComment,
        parentId: null,
        isAnonymous: false,
      });
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!post) {
    if (commentsLoading) return <div className="p-12 text-center text-gray-400">Cargando hilo clínico...</div>;
    return <div className="p-12 text-center text-gray-400">Publicación no encontrada...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <Link to="/" className="inline-flex items-center gap-2 text-accent font-bold mb-8 hover:-translate-x-1 transition-transform group">
        <ArrowBigDown className="w-5 h-5 rotate-90 group-hover:text-primary transition-colors" /> 
        <span className="uppercase tracking-widest text-[10px]">Volver al Inicio</span>
      </Link>

      <PostCard post={post} />

      <div className="mt-12 space-y-8">
        <div className="flex items-center justify-between mb-6 px-4">
          <h4 className="text-xl font-display font-extrabold text-primary">Comentarios ({post.commentCount})</h4>
          <MessageSquare className="w-5 h-5 text-accent" />
        </div>

        {user && (
          <form onSubmit={handleComment} className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm mb-10 ring-1 ring-black/5">
            <textarea 
              placeholder="Añade tu comentario o reflexión clínica..."
              className="w-full px-6 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-accent outline-none resize-none mb-6 font-medium text-gray-700 placeholder:text-gray-300"
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="bg-primary text-white font-display font-bold px-10 py-3 rounded-2xl hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-30 transition-all"
              >
                {isSubmitting ? 'Enviando...' : 'Comentar'}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-6">
          {commentsLoading ? (
            Array(2).fill(0).map((_, i) => <div key={i} className="h-32 bg-white rounded-[2rem] animate-pulse border border-gray-100" />)
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-5 group px-2 animate-in fade-in slide-in-from-left-4 duration-500">
                <img src={comment.authorAvatar} className="w-12 h-12 rounded-2xl bg-gray-50 flex-shrink-0 shadow-sm" alt="Avatar" />
                <div className="flex-1">
                  <div className="bg-white rounded-[2rem] p-6 shadow-sm ring-1 ring-black/5 group-hover:ring-accent/20 transition-all border border-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-display font-extrabold text-primary uppercase tracking-tight">u/{comment.authorPseudonym}</span>
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">• {formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 mt-3 ml-4">
                    <button className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 hover:text-accent uppercase tracking-widest transition-colors">
                      <ArrowBigUp className="w-4 h-4" /> Útil
                    </button>
                    <button className="text-[10px] font-black text-gray-400 hover:text-primary uppercase tracking-widest transition-colors">Responder</button>
                    <button className="text-[10px] font-black text-gray-400 hover:text-red-400 uppercase tracking-widest transition-colors">Reportar</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const SavedPage = () => {
  const { profile } = useAuth();
  const { posts, loading } = usePosts();
  const savedPosts = posts.filter(p => profile?.savedPosts?.includes(p.id));

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-10">
        <h2 className="text-3xl font-display font-black text-primary mb-1">Guardados</h2>
        <p className="text-gray-400 font-medium">Consulta tus publicaciones y evidencias guardadas.</p>
      </div>

      <div className="space-y-8">
        {loading ? (
          Array(2).fill(0).map((_, i) => <div key={i} className="h-64 bg-white rounded-[2rem] animate-pulse border border-gray-100" />)
        ) : savedPosts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-gray-100 ring-1 ring-black/5">
            <Bookmark className="w-16 h-16 text-gray-100 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">No tienes nada guardado aún.</p>
          </div>
        ) : (
          savedPosts.map((post) => (
            <div key={post.id}>
              <PostCard post={post} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const FeedPage = () => {
  const { profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'recientes' | 'tendencias'>('recientes');
  const { posts, loading } = usePosts(undefined, view === 'tendencias');

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      <div className="mb-10">
        <h2 className="text-3xl font-display font-black text-primary mb-1">Buenos días, <span className="text-gradient">Colega</span></h2>
        <p className="text-gray-400 font-medium">¿Qué está pasando hoy en el hospital?</p>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-5 mb-10 premium-shadow flex gap-5 items-center border border-white/50 ring-1 ring-black/5 group cursor-pointer" onClick={() => setIsModalOpen(true)}>
        <img 
          src={profile?.avatarUrl} 
          className="w-14 h-14 rounded-[1.25rem] bg-slate-100 shadow-inner group-hover:scale-105 transition-transform" 
          alt="Avatar"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 bg-gray-50/50 rounded-2xl h-14 px-6 flex items-center text-gray-400 font-bold group-hover:bg-gray-50 transition-colors">
          Comparte un caso, duda o reflexión clínica...
        </div>
        <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20 group-hover:rotate-6 transition-transform">
          <PlusSquare className="w-7 h-7" />
        </div>
      </div>

      <div className="flex items-center gap-6 mb-8 px-2">
        <button 
          onClick={() => setView('recientes')}
          className={cn(
            "flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest transition-all",
            view === 'recientes' ? "text-primary border-b-2 border-accent pb-2" : "text-gray-300 hover:text-gray-500"
          )}
        >
          <Clock className="w-4 h-4" /> Recientes
        </button>
        <button 
          onClick={() => setView('tendencias')}
          className={cn(
            "flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest transition-all",
            view === 'tendencias' ? "text-primary border-b-2 border-accent pb-2" : "text-gray-300 hover:text-gray-500"
          )}
        >
          <Flame className="w-4 h-4" /> Tendencias
        </button>
      </div>

      <div className="space-y-8">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-[2rem] p-8 animate-pulse border border-gray-100 h-64"></div>
          ))
        ) : (
          posts.map((post) => (
            <div key={post.id}>
              <PostCard post={post} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const LoginPage = () => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-surface p-4 overflow-hidden relative">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/10 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/10 backdrop-blur-2xl rounded-[3rem] p-12 text-center border border-white/10 shadow-2xl z-10"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/40 group">
          <PlusSquare className="text-white w-12 h-12 group-hover:scale-110 transition-transform" />
        </div>
        <h2 className="text-5xl font-display font-black text-white mb-4 tracking-tighter">LUMI</h2>
        <p className="text-indigo-200 mb-12 font-medium leading-relaxed">
          La red social anónima exclusiva para profesionales y estudiantes de enfermería.
        </p>
        
        <div className="space-y-4">
          <button 
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-4 bg-white text-primary rounded-[1.5rem] px-4 py-5 font-display font-black hover:bg-accent hover:text-white transition-all transform hover:-translate-y-1 active:scale-95 shadow-xl shadow-black/20"
          >
            <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
            Continuar con Identidad
          </button>
          
          <button className="w-full py-4 text-xs font-bold text-indigo-300 hover:text-white transition-colors">
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/5 space-y-5">
          <div className="flex items-center gap-3 text-xs text-indigo-200/60 justify-center font-bold">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping"></span>
            <span>Comunidades Anónimas Seguras</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-indigo-200/60 justify-center font-bold">
            <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
            <span>Networking Profesional Privado</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-slate-soft selection:bg-accent/30 lowercase-labels">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={
              <AuthGuard>
                <div className="flex min-h-screen relative">
                  <Sidebar />
                  <main className="flex-1 xl:ml-72 2xl:mr-80 min-h-screen pb-20">
                    <AnimatePresence mode="wait">
                      <Routes>
                        <Route path="/" element={<FeedPage />} />
                        <Route path="/post/:id" element={<PostDetailPage />} />
                        <Route path="/popular" element={<div className="p-12 text-center text-gray-400 font-bold">Tendencias globales en desarrollo...</div>} />
                        <Route path="/communities" element={<div className="p-12 text-center text-gray-400 font-bold">Explora gremios y comunidades...</div>} />
                        <Route path="/notifications" element={<div className="p-12 text-center text-gray-400 font-bold">Tu centro de notificaciones...</div>} />
                        <Route path="/saved" element={<SavedPage />} />
                        <Route path="/profile/:id" element={<div className="p-12 text-center text-gray-400 font-bold">Perfil profesional del colega...</div>} />
                        <Route path="/settings" element={<div className="p-12 text-center text-gray-400 font-bold">Configuración de seguridad y privacidad...</div>} />
                        <Route path="*" element={<Navigate to="/" />} />
                      </Routes>
                    </AnimatePresence>
                  </main>
                  <RightPanel />
                </div>
              </AuthGuard>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}
