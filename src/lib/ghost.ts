const GHOST_URL = 'https://blog.taxaware.ng';
const GHOST_CONTENT_KEY = 'c8d14d2627b14fcd75eb0b79f3';

export interface GhostPost {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  html: string;
  excerpt: string;
  feature_image: string | null;
  published_at: string;
  reading_time: number;
  primary_tag: { name: string; slug: string } | null;
  tags: { name: string; slug: string }[];
  primary_author: { name: string; profile_image: string | null } | null;
}

interface GhostResponse {
  posts: GhostPost[];
  meta: { pagination: { page: number; limit: number; pages: number; total: number } };
}

async function ghostFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`/ghost/api/content/${endpoint}/`, GHOST_URL);
  url.searchParams.set('key', GHOST_CONTENT_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Ghost API error: ${res.status}`);
  return res.json();
}

export async function getPosts(page = 1, limit = 9): Promise<GhostResponse> {
  return ghostFetch<GhostResponse>('posts', {
    page: String(page),
    limit: String(limit),
    include: 'tags,authors',
    fields: 'id,uuid,title,slug,excerpt,feature_image,published_at,reading_time',
  });
}

export async function getPost(slug: string): Promise<GhostPost> {
  const data = await ghostFetch<{ posts: GhostPost[] }>(`posts/slug/${slug}`, {
    include: 'tags,authors',
  });
  return data.posts[0];
}
