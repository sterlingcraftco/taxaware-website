import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ConsultantScheduling() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
              <Phone className="w-6 h-6 text-primary" />
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
              <Crown className="w-3 h-3" />
              Premium
            </Badge>
          </div>
          <CardTitle>Book a Call</CardTitle>
          <CardDescription>
            Schedule a one-on-one tax consultation with TaxAware NG
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)} className="w-full">
            Schedule Now
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-[80vw] max-h-[90vh] overflow-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Book a Call with TaxAware NG
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-lg overflow-hidden border border-border">
            <iframe
              src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ1jAw423pxGILK26uCuth0oSMBTJmQ9_4VCMtw-prhXJmecLeIHdD6HjBl1wJLVegCgEgsZisit?gv=true"
              style={{ border: 0 }}
              width="100%"
              height="550"
              frameBorder="0"
              title="Book a consultation with TaxAware NG"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
