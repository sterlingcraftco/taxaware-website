import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, FileText } from 'lucide-react';

export default function TINLookup() {
  return (
    <Card className="hover:shadow-lg transition-shadow relative overflow-hidden">
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-10 flex items-center justify-center">
        <div className="text-center p-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-2">
            Coming Soon
          </div>
          <p className="text-xs text-muted-foreground">This feature is under development</p>
        </div>
      </div>

      <CardHeader>
        <div className="p-3 rounded-lg bg-blue-500/10 w-fit mb-2">
          <FileText className="w-6 h-6 text-blue-500" />
        </div>
        <CardTitle>TIN Lookup</CardTitle>
        <CardDescription>
          Retrieve your Tax Identification Number using your NIN
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="w-full gap-2" disabled>
          <Search className="w-4 h-4" />
          Look Up TIN
        </Button>
      </CardContent>
    </Card>
  );
}
