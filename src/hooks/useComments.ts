import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  increment
} from 'firebase/firestore';

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  authorPseudonym: string;
  authorAvatar: string;
  content: string;
  upvotes: number;
  createdAt: any;
  isAnonymous: boolean;
}

export function useComments(postId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;

    const q = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(newComments);
      setLoading(false);
    });

    return unsubscribe;
  }, [postId]);

  return { comments, loading };
}

export async function createComment(postId: string, data: Partial<Comment>) {
  const commentData = {
    ...data,
    postId,
    upvotes: 0,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "posts", postId, "comments"), commentData);
  
  // Increment comment count on post
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    commentCount: increment(1)
  });

  return docRef.id;
}
