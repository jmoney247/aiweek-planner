"use client";
import { useSearchParams } from 'next/navigation';
import CommunityFeed from './CommunityFeed';
export default function CommentsPageContent() {
  const postId = useSearchParams().get('post') ?? undefined;
  return <CommunityFeed key={postId ?? 'all'} postId={postId} />;
}
