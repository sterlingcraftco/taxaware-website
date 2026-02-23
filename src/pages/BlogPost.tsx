import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getPost } from '@/lib/ghost';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import Footer from '@/components/Footer';
import { format } from 'date-fns';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['ghost-post', slug],
    queryFn: () => getPost(slug!),
    enabled: !!slug,
  });

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="hero-gradient py-12 md:py-20">
        <div className="container max-w-3xl">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>

          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4 bg-primary-foreground/20" />
              <Skeleton className="h-5 w-1/2 bg-primary-foreground/20" />
            </div>
          )}

          {post && (
            <>
              {post.primary_tag && (
                <span className="text-xs font-semibold text-accent uppercase tracking-wide">
                  {post.primary_tag.name}
                </span>
              )}
              <h1 className="text-2xl md:text-4xl font-extrabold text-primary-foreground mt-1 mb-4">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-primary-foreground/70">
                {post.primary_author && <span>By {post.primary_author.name}</span>}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(post.published_at), 'MMMM d, yyyy')}
                </span>
                {post.reading_time > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {post.reading_time} min read
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Wave */}
      <div className="w-full overflow-hidden -mt-1">
        <svg viewBox="0 0 1440 60" className="w-full" preserveAspectRatio="none">
          <path d="M0,60 L0,20 Q360,0 720,20 Q1080,40 1440,20 L1440,60 Z" fill="hsl(var(--background))" />
        </svg>
      </div>

      {/* Content */}
      <article className="container max-w-3xl py-10">
        {error && (
          <p className="text-destructive text-center py-12">Failed to load post.</p>
        )}

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        )}

        {post?.feature_image && (
          <img
            src={post.feature_image}
            alt={post.title}
            className="w-full rounded-xl mb-8 shadow-lg"
          />
        )}

        {post?.html && (
          <div
            className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-foreground prose-a:text-primary prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
        )}

        <div className="mt-12 pt-8 border-t border-border text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to all posts
          </Link>
        </div>
      </article>

      <Footer />
    </main>
  );
}
