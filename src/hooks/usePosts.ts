import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { moderateContent } from '../services/aiModeration';

export interface Post {
  id: string;
  authorId: string;
  authorPseudonym: string;
  authorAvatar: string;
  title: string;
  content: string;
  communityId: string;
  communityName: string;
  upvotes: number;
  downvotes: number;
  score: number;
  commentCount: number;
  createdAt: any;
  medicalFlag: boolean;
  isAnonymous: boolean;
  hashtags: string[];
}

export function usePosts(communityId?: string, trending?: boolean) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
    
    if (trending) {
      q = query(collection(db, "posts"), orderBy("score", "desc"), limit(20));
    } else if (communityId && communityId !== 'all') {
      q = query(collection(db, "posts"), where("communityId", "==", communityId), orderBy("createdAt", "desc"), limit(50));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(newPosts);
      setLoading(false);
    });

    return unsubscribe;
  }, [communityId, trending]);

  return { posts, loading };
}

export async function createPost(data: Partial<Post>) {
  // Extract hashtags
  const hashtags = data.content?.match(/#[a-z0-9_]+/gi) || [];

  // AI Moderation before saving
  const modResult = await moderateContent((data.content || "") + " " + (data.title || ""));
  
  if (!modResult.isSafe) {
    throw new Error(`Contenido rechazado: ${modResult.reason}`);
  }

  const postData = {
    ...data,
    hashtags,
    upvotes: 1,
    downvotes: 0,
    score: 1,
    commentCount: 0,
    medicalFlag: modResult.medicalFlag,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "posts"), postData);
  return docRef.id;
}
