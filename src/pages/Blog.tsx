import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getPosts, GhostPost } from '@/lib/ghost';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import Footer from '@/components/Footer';
import { format } from 'date-fns';

function PostCard({ post }: { post: GhostPost }) {
  return (
    <Link to={`/blog/${post.slug}`} className="group">
      <Card className="overflow-hidden h-full transition-shadow hover:shadow-lg border-border">
        {post.feature_image && (
          <div className="aspect-video overflow-hidden">
            <img
              src={post.feature_image}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        )}
        <CardContent className="p-5">
          {post.primary_tag && (
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
              {post.primary_tag.name}
            </span>
          )}
          <h2 className="text-lg font-bold text-foreground mt-1 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h2>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.excerpt}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(post.published_at), 'MMM d, yyyy')}
            </span>
            {post.reading_time > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {post.reading_time} min read
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Blog() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ghost-posts', page],
    queryFn: () => getPosts(page),
  });

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="hero-gradient py-16 md:py-24">
        <div className="container text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <h1 className="text-3xl md:text-5xl font-extrabold text-primary-foreground mb-3">
            TaxAware Blog
          </h1>
          <p className="text-primary-foreground/80 max-w-xl mx-auto">
            Insights, guides, and updates on Nigerian tax compliance
          </p>
        </div>
      </section>

      {/* Wave divider */}
      <div className="w-full overflow-hidden -mt-1">
        <svg viewBox="0 0 1440 60" className="w-full" preserveAspectRatio="none">
          <path d="M0,60 L0,20 Q360,0 720,20 Q1080,40 1440,20 L1440,60 Z" fill="hsl(var(--background))" />
        </svg>
      </div>

      {/* Posts grid */}
      <section className="container py-12">
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load posts. Please try again later.</p>
          </div>
        )}

        {isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {data.posts.length === 0 && (
              <p className="text-center text-muted-foreground py-12">No posts yet. Check back soon!</p>
            )}

            {data.meta.pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-3">
                  Page {page} of {data.meta.pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.meta.pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </main>
  );
}
