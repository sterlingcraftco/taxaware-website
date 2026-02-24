import { useParams, Navigate } from "react-router-dom";
import { useEffect } from "react";

const documentMap: Record<string, string> = {
  "nta-2025": "/documents/nigeria-tax-act-2025.pdf",
  "ntaa-2025": "/documents/nigeria-tax-administration-act-2025.pdf",
};

export default function PublicDocument() {
  const { slug } = useParams<{ slug: string }>();
  const pdfPath = slug ? documentMap[slug] : undefined;

  useEffect(() => {
    if (pdfPath) {
      window.location.href = pdfPath;
    }
  }, [pdfPath]);

  if (!pdfPath) return <Navigate to="/resources" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting to document…</p>
    </div>
  );
}
