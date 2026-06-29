import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { generatePseudo } from '@/constants/hubPseudo';
import {
  fetchPosts,
  fetchPostDetail,
  createPost as apiCreatePost,
  createComment as apiCreateComment,
  reactToPost as apiReactToPost,
  reportPost as apiReportPost,
  reportComment as apiReportComment,
  type HubPost,
  type HubComment,
  type CreatePostInput,
} from '@/utils/hubApi';

const USER_ID_KEY = 'hub_user_id';
const PSEUDO_KEY = 'hub_pseudo';
const PSEUDO_EDITED_KEY = 'hub_pseudo_edited';
const BLOCKED_KEY = 'hub_blocked';

export type HubFilter = 'all' | 'denunciation' | 'discussion';

interface HubIdentity {
  userId: string;
  pseudo: string;
  pseudoEdited: boolean;
  blockedIds: string[];
}

function randomUserId(): string {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

async function loadIdentity(): Promise<HubIdentity> {
  const [storedId, storedPseudo, storedEdited, storedBlocked] = await Promise.all([
    AsyncStorage.getItem(USER_ID_KEY),
    AsyncStorage.getItem(PSEUDO_KEY),
    AsyncStorage.getItem(PSEUDO_EDITED_KEY),
    AsyncStorage.getItem(BLOCKED_KEY),
  ]);

  let userId = storedId;
  if (!userId) {
    userId = randomUserId();
    await AsyncStorage.setItem(USER_ID_KEY, userId);
  }

  let pseudo = storedPseudo;
  if (!pseudo) {
    pseudo = generatePseudo();
    await AsyncStorage.setItem(PSEUDO_KEY, pseudo);
  }

  let blockedIds: string[] = [];
  if (storedBlocked) {
    try {
      blockedIds = JSON.parse(storedBlocked) as string[];
    } catch {
      blockedIds = [];
    }
  }

  return { userId, pseudo, pseudoEdited: storedEdited === '1', blockedIds };
}

export const [HubProvider, useHub] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [identity, setIdentity] = useState<HubIdentity | null>(null);

  const identityQuery = useQuery({
    queryKey: ['hubIdentity'],
    queryFn: loadIdentity,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (identityQuery.data) setIdentity(identityQuery.data);
  }, [identityQuery.data]);

  const userId = identity?.userId ?? '';
  const pseudo = identity?.pseudo ?? '';
  const canEditPseudo = identity ? !identity.pseudoEdited : false;
  const blockedIds = useMemo(() => identity?.blockedIds ?? [], [identity]);

  const updatePseudo = useCallback(async (next: string) => {
    const clean = next.trim().slice(0, 24);
    if (!clean) return;
    setIdentity((cur) => (cur ? { ...cur, pseudo: clean, pseudoEdited: true } : cur));
    await AsyncStorage.multiSet([
      [PSEUDO_KEY, clean],
      [PSEUDO_EDITED_KEY, '1'],
    ]);
  }, []);

  const blockUser = useCallback(async (id: string) => {
    if (!id) return;
    let nextList: string[] = [];
    setIdentity((cur) => {
      if (!cur) return cur;
      if (cur.blockedIds.includes(id)) {
        nextList = cur.blockedIds;
        return cur;
      }
      nextList = [...cur.blockedIds, id];
      return { ...cur, blockedIds: nextList };
    });
    await AsyncStorage.setItem(BLOCKED_KEY, JSON.stringify(nextList));
    // Drop the blocked member's content from any cached feed immediately.
    await queryClient.invalidateQueries({ queryKey: ['hubPosts'] });
  }, [queryClient]);

  const unblockUser = useCallback(async (id: string) => {
    let nextList: string[] = [];
    setIdentity((cur) => {
      if (!cur) return cur;
      nextList = cur.blockedIds.filter((b) => b !== id);
      return { ...cur, blockedIds: nextList };
    });
    await AsyncStorage.setItem(BLOCKED_KEY, JSON.stringify(nextList));
  }, []);

  const isBlocked = useCallback((id: string) => blockedIds.includes(id), [blockedIds]);

  const createPostMutation = useMutation({
    mutationFn: (input: Omit<CreatePostInput, 'authorId' | 'authorName'>) =>
      apiCreatePost({ ...input, authorId: userId, authorName: pseudo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hubPosts'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ postId, body }: { postId: string; body: string }) =>
      apiCreateComment(postId, { authorId: userId, authorName: pseudo, body }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['hubPost', variables.postId] });
      void queryClient.invalidateQueries({ queryKey: ['hubPosts'] });
    },
  });

  const reactMutation = useMutation({
    mutationFn: (postId: string) => apiReactToPost(postId, userId),
  });

  // Optimistic like: flips likedByMe + count in every cache that holds this post,
  // then reconciles with the server's authoritative count.
  const toggleReaction = useCallback(
    async (postId: string) => {
      const patch = (p: HubPost): HubPost =>
        p.id === postId
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likeCount: Math.max(0, p.likeCount + (p.likedByMe ? -1 : 1)),
            }
          : p;

      queryClient.setQueriesData<HubPost[]>({ queryKey: ['hubPosts'] }, (old) =>
        old ? old.map(patch) : old,
      );
      queryClient.setQueriesData<{ post: HubPost; comments: HubComment[] }>(
        { queryKey: ['hubPost', postId] },
        (old) => (old ? { ...old, post: patch(old.post) } : old),
      );

      try {
        const result = await reactMutation.mutateAsync(postId);
        const reconcile = (p: HubPost): HubPost =>
          p.id === postId ? { ...p, likedByMe: result.liked, likeCount: result.likeCount } : p;
        queryClient.setQueriesData<HubPost[]>({ queryKey: ['hubPosts'] }, (old) =>
          old ? old.map(reconcile) : old,
        );
        queryClient.setQueriesData<{ post: HubPost; comments: HubComment[] }>(
          { queryKey: ['hubPost', postId] },
          (old) => (old ? { ...old, post: reconcile(old.post) } : old),
        );
      } catch (e) {
        console.log('[Hub] reaction failed, rolling back', e);
        queryClient.setQueriesData<HubPost[]>({ queryKey: ['hubPosts'] }, (old) =>
          old ? old.map(patch) : old,
        );
        queryClient.setQueriesData<{ post: HubPost; comments: HubComment[] }>(
          { queryKey: ['hubPost', postId] },
          (old) => (old ? { ...old, post: patch(old.post) } : old),
        );
      }
    },
    [queryClient, reactMutation],
  );

  const reportPostMutation = useMutation({
    mutationFn: (postId: string) => apiReportPost(postId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hubPosts'] });
    },
  });

  const reportCommentMutation = useMutation({
    mutationFn: (commentId: string) => apiReportComment(commentId, userId),
  });

  return useMemo(
    () => ({
      userId,
      pseudo,
      canEditPseudo,
      isReady: !!identity,
      updatePseudo,
      blockedIds,
      blockUser,
      unblockUser,
      isBlocked,
      createPost: createPostMutation.mutateAsync,
      isPosting: createPostMutation.isPending,
      addComment: commentMutation.mutateAsync,
      isCommenting: commentMutation.isPending,
      toggleReaction,
      reportPost: reportPostMutation.mutateAsync,
      reportComment: reportCommentMutation.mutateAsync,
    }),
    [
      userId,
      pseudo,
      canEditPseudo,
      identity,
      updatePseudo,
      blockedIds,
      blockUser,
      unblockUser,
      isBlocked,
      createPostMutation.mutateAsync,
      createPostMutation.isPending,
      commentMutation.mutateAsync,
      commentMutation.isPending,
      toggleReaction,
      reportPostMutation.mutateAsync,
      reportCommentMutation.mutateAsync,
    ],
  );
});

/** Feed query for a filter, with blocked members removed client-side. */
export function useHubFeed(filter: HubFilter) {
  const { userId, isReady, blockedIds } = useHub();
  const query = useQuery({
    queryKey: ['hubPosts', filter, userId],
    queryFn: () => fetchPosts(filter, userId),
    enabled: isReady,
    staleTime: 1000 * 30,
  });
  const posts = useMemo(
    () => (query.data ?? []).filter((p) => !blockedIds.includes(p.authorId)),
    [query.data, blockedIds],
  );
  return { ...query, posts };
}

/** Detail query for a single post, with blocked members' comments removed. */
export function useHubPost(postId: string) {
  const { userId, isReady, blockedIds } = useHub();
  const query = useQuery({
    queryKey: ['hubPost', postId, userId],
    queryFn: () => fetchPostDetail(postId, userId),
    enabled: isReady && !!postId,
  });
  const comments = useMemo(
    () => (query.data?.comments ?? []).filter((c) => !blockedIds.includes(c.authorId)),
    [query.data, blockedIds],
  );
  return { ...query, post: query.data?.post ?? null, comments };
}
